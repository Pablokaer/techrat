"""Tests for deploy/remote-deploy.sh (run: python3 -m unittest discover -s deploy -p "test_*.py").

A fake `ssh` first on PATH plays a scripted outcome per call ("<exit code> <stderr message>") and records its arguments;
a fake `curl` stands in for the public-IP lookup. No network is involved.
"""
import os
import shutil
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "remote-deploy.sh"
BASH = shutil.which("bash") or "bash"
SHA = "a" * 40
HOST = "192.0.2.1"
TIMED_OUT = f"ssh: connect to host {HOST} port 22: Connection timed out"


def write_exe(path: Path, body: str):
    path.write_text("#!/usr/bin/env bash\n" + body, newline="\n")
    path.chmod(path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)


class RemoteDeployTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        self.calls = self.tmp / "calls"
        self.plan = self.tmp / "plan"
        calls, plan = self.calls.as_posix(), self.plan.as_posix()
        write_exe(bin_dir / "ssh", f"""
echo "$*" >> "{calls}"
line="$(head -n 1 "{plan}")"
tail -n +2 "{plan}" > "{plan}.rest" && mv "{plan}.rest" "{plan}"
message="${{line#* }}"
[ "$message" != "$line" ] && echo "$message" >&2
exit "${{line%% *}}"
""")
        write_exe(bin_dir / "curl", "echo 203.0.113.7\n")
        self.env = {**os.environ, "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}", "VPS_HOST": HOST,
                    "VPS_SSH_KEY": "fake-key", "VPS_KNOWN_HOSTS": f"{HOST} ssh-ed25519 AAAA", "SSH_RETRY_DELAY": "0"}

    def deploy(self, *outcomes):
        self.plan.write_text("".join(f"{o}\n" for o in outcomes), newline="\n")
        result = subprocess.run([BASH, str(SCRIPT), SHA], env=self.env, capture_output=True, text=True)
        calls = self.calls.read_text().splitlines() if self.calls.exists() else []
        return result, calls

    def test_a_reachable_server_is_asked_once_with_a_short_connect_timeout(self):
        result, calls = self.deploy("0")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(calls), 1)
        for option in ("ConnectTimeout=20", "BatchMode=yes", "StrictHostKeyChecking=yes"):
            self.assertIn(f"-o {option}", calls[0])
        self.assertTrue(calls[0].endswith(f"root@{HOST} {SHA}"), calls[0])

    def test_a_connection_timeout_is_retried(self):
        result, calls = self.deploy(f"255 {TIMED_OUT}", "0")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(calls), 2)

    def test_a_failed_deploy_on_the_server_is_not_retried(self):
        # deploy.sh ran and rolled back: running it again would not help.
        result, calls = self.deploy("1", "0")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(calls), 1)

    def test_a_rejected_key_is_not_retried(self):
        result, calls = self.deploy(f"255 root@{HOST}: Permission denied (publickey).", "0")
        self.assertEqual(result.returncode, 255)
        self.assertEqual(len(calls), 1)
        self.assertIn("Permission denied", result.stderr)

    def test_a_server_that_never_answers_exits_75_and_names_the_runner_ip(self):
        result, calls = self.deploy(*[f"255 {TIMED_OUT}"] * 3)
        self.assertEqual(result.returncode, 75)
        self.assertEqual(len(calls), 3)
        self.assertIn("203.0.113.7", result.stderr)
        self.assertIn(TIMED_OUT, result.stderr)  # ssh's own message stays in the log


if __name__ == "__main__":
    unittest.main()
