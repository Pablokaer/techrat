"""Tests for .github/scripts/auto_merge.py (run: python3 -m unittest discover -s deploy -p "test_*.py").

The script decides whether the auto-merge workflow turns auto-merge on for a pull request.
"""
import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / ".github" / "scripts" / "auto_merge.py"
REPO = "Pablokaer/techrat"


def load():
    spec = importlib.util.spec_from_file_location("auto_merge", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ShouldEnableTest(unittest.TestCase):
    def setUp(self):
        self.should = load().should_enable

    def check(self, **overrides):
        args = dict(draft=False, head_repo=REPO, this_repo=REPO, labels=[])
        args.update(overrides)
        return self.should(**args)

    def test_ordinary_pull_request_gets_auto_merge(self):
        self.assertTrue(self.check())

    def test_draft_is_left_alone(self):
        self.assertFalse(self.check(draft=True))

    def test_fork_is_left_alone(self):
        self.assertFalse(self.check(head_repo="someone/techrat"))

    def test_opt_out_label_is_respected(self):
        self.assertFalse(self.check(labels=["bug", "no-auto-merge"]))

    def test_other_labels_do_not_block(self):
        self.assertTrue(self.check(labels=["bug"]))


if __name__ == "__main__":
    unittest.main()
