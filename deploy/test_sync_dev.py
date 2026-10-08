"""Tests for .github/scripts/sync_dev.py (run: python3 -m unittest discover -s deploy -p "test_*.py").

After a dev -> main promotion the merge commit exists only on main. The script fast-forwards dev to main so the two
branches stop diverging, and never rewrites dev history.
"""
import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / ".github" / "scripts" / "sync_dev.py"


def load():
    spec = importlib.util.spec_from_file_location("sync_dev", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PlanTest(unittest.TestCase):
    def setUp(self):
        self.plan = load().plan

    def test_skips_when_dev_already_has_everything_on_main(self):
        self.assertEqual(self.plan(dev_is_ancestor=True, main_ahead_by=0), "skip")

    def test_fast_forwards_when_main_only_has_promotion_merge_commits(self):
        self.assertEqual(self.plan(dev_is_ancestor=True, main_ahead_by=2), "fast-forward")

    def test_skips_when_dev_moved_on_after_the_promotion(self):
        # dev has commits main does not: a fast-forward is impossible; the next promotion brings main's merge commit back.
        self.assertEqual(self.plan(dev_is_ancestor=False, main_ahead_by=1), "skip")


def git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


class SyncAgainstRealRepositoriesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.remote = root / "remote.git"
        self.work = root / "work"
        subprocess.run(["git", "init", "-q", "--bare", "-b", "main", str(self.remote)], check=True)
        subprocess.run(["git", "clone", "-q", str(self.remote), str(self.work)], check=True, capture_output=True)
        for key, value in (("user.name", "t"), ("user.email", "t@t"), ("commit.gpgsign", "false")):
            git(self.work, "config", key, value)
        self.commit("a")
        git(self.work, "push", "-q", "origin", "main")
        git(self.work, "checkout", "-q", "-b", "dev")
        self.commit("b")
        git(self.work, "push", "-q", "origin", "dev")

    def tearDown(self):
        self.tmp.cleanup()

    def commit(self, name):
        (self.work / name).write_text(name)
        git(self.work, "add", name)
        git(self.work, "commit", "-q", "-m", name)

    def promote(self):
        git(self.work, "checkout", "-q", "main")
        git(self.work, "merge", "-q", "--no-ff", "-m", "promote", "dev")
        git(self.work, "push", "-q", "origin", "main")

    def remote_sha(self, branch):
        return git(self.remote, "rev-parse", branch)

    def test_dev_catches_up_with_the_promotion_merge_commit(self):
        self.promote()
        self.assertNotEqual(self.remote_sha("dev"), self.remote_sha("main"))
        self.assertEqual(load().main(str(self.work)), 0)
        self.assertEqual(self.remote_sha("dev"), self.remote_sha("main"))

    def test_does_not_touch_dev_when_it_has_new_commits(self):
        self.promote()
        git(self.work, "checkout", "-q", "dev")
        self.commit("c")
        git(self.work, "push", "-q", "origin", "dev")
        before = self.remote_sha("dev")
        self.assertEqual(load().main(str(self.work)), 0)
        self.assertEqual(self.remote_sha("dev"), before)


if __name__ == "__main__":
    unittest.main()
