"""Tests for .github/scripts/auto_promote.py (run: python3 -m unittest discover -s deploy -p "test_*.py").

The script decides what the auto-promotion workflow does after CI passes on dev: nothing when dev has nothing new,
open the dev -> main pull request when it does not exist yet, and always (re)enable auto-merge on it.
"""
import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / ".github" / "scripts" / "auto_promote.py"


def load():
    spec = importlib.util.spec_from_file_location("auto_promote", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PlanTest(unittest.TestCase):
    def setUp(self):
        self.plan = load().plan

    def test_nothing_to_promote_when_dev_is_not_ahead(self):
        self.assertEqual(self.plan(0, []), ("skip", None))

    def test_nothing_to_promote_even_if_a_stale_pr_is_open(self):
        self.assertEqual(self.plan(0, [7]), ("skip", None))

    def test_opens_the_pull_request_when_dev_is_ahead_and_none_is_open(self):
        self.assertEqual(self.plan(3, []), ("create", None))

    def test_reuses_the_open_pull_request(self):
        self.assertEqual(self.plan(3, [12]), ("merge", 12))

    def test_picks_the_oldest_when_several_are_open(self):
        self.assertEqual(self.plan(1, [14, 12]), ("merge", 12))


class ParseTest(unittest.TestCase):
    def test_ahead_by_is_read_from_the_compare_payload(self):
        self.assertEqual(load().parse_ahead_by('{"ahead_by": 4, "status": "ahead"}'), 4)

    def test_open_pull_requests_are_listed_by_number(self):
        self.assertEqual(load().parse_numbers('[{"number": 14}, {"number": 12}]'), [14, 12])


if __name__ == "__main__":
    unittest.main()
