"""Tests for .github/scripts/promotion_gate.py (run: python3 -m unittest discover -s deploy -p "test_*.py").

The script is the "promotion gate": a pull request into main is only valid when it comes from dev of this repository.
"""
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / ".github" / "scripts" / "promotion_gate.py"
REPO = "Pablokaer/techrat"


def gate(base, head, head_repo=REPO, repo=REPO):
    return subprocess.run(
        [sys.executable, "-I", str(SCRIPT), base, head, head_repo, repo], capture_output=True, text=True
    )


class PromotionGateTest(unittest.TestCase):
    def test_dev_into_main_passes(self):
        self.assertEqual(gate("main", "dev").returncode, 0)

    def test_feature_branch_into_main_is_rejected(self):
        result = gate("main", "feat/x")
        self.assertEqual(result.returncode, 1)
        self.assertIn("dev", result.stdout + result.stderr)

    def test_fork_named_dev_into_main_is_rejected(self):
        self.assertEqual(gate("main", "dev", head_repo="someone/techrat").returncode, 1)

    def test_main_into_main_is_rejected(self):
        self.assertEqual(gate("main", "main").returncode, 1)

    def test_other_targets_are_not_gated(self):
        self.assertEqual(gate("dev", "feat/x").returncode, 0)


if __name__ == "__main__":
    unittest.main()
