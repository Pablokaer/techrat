"""Tests for deploy/deploy.sh (run: python3 -m unittest discover -s deploy -p "test_*.py").

Each test builds a throwaway "origin" repository and a clone standing in for /opt/techrat, and puts fake `docker`
and `curl` executables first on PATH: docker records its arguments, curl succeeds or fails on demand. No real
containers or network are involved.
"""
import os
import shutil
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "deploy.sh"
BASH = shutil.which("bash") or "bash"


def git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


def write_exe(path: Path, body: str):
    path.write_text("#!/usr/bin/env bash\n" + body, newline="\n")
    path.chmod(path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)


class DeployScriptTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        origin = self.tmp / "origin"
        origin.mkdir()
        git(origin, "init", "-q", "-b", "main")
        git(origin, "config", "user.email", "t@t.io")
        git(origin, "config", "user.name", "t")
        (origin / "app.txt").write_text("v1\n")
        git(origin, "add", ".")
        git(origin, "commit", "-q", "-m", "v1")
        self.v1 = git(origin, "rev-parse", "HEAD")
        self.origin = origin

        self.app = self.tmp / "app"
        git(self.tmp, "clone", "-q", str(origin), str(self.app))
        (self.app / ".env").write_text("SECRET=keep-me\n")  # untracked production settings

        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        self.docker_log = self.tmp / "docker.log"
        write_exe(bin_dir / "docker", f'echo "$*" >> "{self.docker_log.as_posix()}"\n')
        write_exe(bin_dir / "curl", 'exit "${FAKE_CURL_EXIT:-0}"\n')
        self.env = {
            **os.environ,
            "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
            "TECHRAT_DIR": str(self.app),
            "LOG_FILE": str(self.tmp / "deploy.log"),
            "HEALTH_RETRIES": "2",
            "HEALTH_INTERVAL": "0",
        }
        self.env.pop("SSH_ORIGINAL_COMMAND", None)

    def push_v2(self):
        (self.origin / "app.txt").write_text("v2\n")
        git(self.origin, "commit", "-qam", "v2")
        return git(self.origin, "rev-parse", "HEAD")

    def run_deploy(self, *args, **env):
        return subprocess.run([BASH, str(SCRIPT), *args], env={**self.env, **env}, capture_output=True, text=True)

    def docker_calls(self):
        return self.docker_log.read_text().splitlines() if self.docker_log.exists() else []

    def head(self):
        return git(self.app, "rev-parse", "HEAD")

    def test_deploys_the_requested_commit_and_keeps_the_env_file(self):
        v2 = self.push_v2()
        r = self.run_deploy(v2)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.head(), v2)
        self.assertEqual((self.app / "app.txt").read_text(), "v2\n")
        self.assertEqual((self.app / ".env").read_text(), "SECRET=keep-me\n")
        calls = self.docker_calls()
        self.assertTrue(any("-f docker-compose.prod.yml up -d --build" in c for c in calls), calls)
        self.assertTrue(any(c.startswith("image prune") and "com.docker.compose.project=techrat" in c for c in calls), calls)

    def test_the_command_can_come_from_the_ssh_forced_command(self):
        v2 = self.push_v2()
        r = self.run_deploy(SSH_ORIGINAL_COMMAND=v2)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.head(), v2)

    def test_without_a_commit_deploys_the_tip_of_main(self):
        v2 = self.push_v2()
        r = self.run_deploy()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.head(), v2)

    def test_rejects_anything_that_is_not_a_commit_sha(self):
        for bad in ["main; rm -rf /", "abc", "$(id)"]:
            r = self.run_deploy(SSH_ORIGINAL_COMMAND=bad)
            self.assertEqual(r.returncode, 2, bad)
        self.assertEqual(self.docker_calls(), [])
        self.assertEqual(self.head(), self.v1)

    def test_skips_a_commit_that_is_no_longer_the_tip_of_main(self):
        v2 = self.push_v2()
        (self.origin / "app.txt").write_text("v3\n")
        git(self.origin, "commit", "-qam", "v3")
        r = self.run_deploy(v2)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("not the tip of main", r.stdout)
        self.assertEqual(self.docker_calls(), [])
        self.assertEqual(self.head(), self.v1)

    def test_rolls_back_when_the_new_version_is_unhealthy(self):
        v2 = self.push_v2()
        r = self.run_deploy(v2, FAKE_CURL_EXIT="22")
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("rolling back", r.stdout)
        self.assertEqual(self.head(), self.v1)
        ups = [c for c in self.docker_calls() if " up -d --build" in c]
        self.assertEqual(len(ups), 2, ups)  # the new version, then the previous one again


if __name__ == "__main__":
    unittest.main()
