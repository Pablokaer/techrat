"""Tests for the GitHub Actions workflows (run: python3 -m unittest discover -s deploy -p "test_*.py").

A job without `timeout-minutes` runs for GitHub's default of six hours when a step hangs: on 2026-10-22 the end-to-end
job sat for over an hour in `npx playwright install` before it was cancelled by hand. Every job therefore declares a
limit close to its real duration, and the steps that download from outside get a shorter one of their own.

The files are read line by line (no YAML library on the runner is assumed); the workflows use two-space indentation.
"""
import re
import unittest
from pathlib import Path

WORKFLOWS = Path(__file__).resolve().parent.parent / ".github" / "workflows"
JOB = re.compile(r"^  ([A-Za-z0-9_-]+):\s*$")


def jobs(path: Path) -> dict[str, list[str]]:
    """The lines of each job under the top-level `jobs:` key."""
    found: dict[str, list[str]] = {}
    inside, current = False, None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("jobs:"):
            inside = True
            continue
        if inside and line and not line.startswith(" ") and not line.startswith("#"):
            inside = False
        if not inside:
            continue
        if m := JOB.match(line):
            current = m.group(1)
            found[current] = []
        elif current:
            found[current].append(line)
    return found


def timeout(lines: list[str]) -> int | None:
    for line in lines:
        if m := re.match(r"^    timeout-minutes:\s*(\d+)\s*$", line):
            return int(m.group(1))
    return None


class WorkflowTimeoutTest(unittest.TestCase):
    def test_there_are_workflows_to_check(self):
        self.assertGreaterEqual(len(list(WORKFLOWS.glob("*.yml"))), 6)

    def test_every_job_declares_a_timeout_well_below_the_six_hour_default(self):
        for path in sorted(WORKFLOWS.glob("*.yml")):
            for name, lines in jobs(path).items():
                with self.subTest(workflow=path.name, job=name):
                    minutes = timeout(lines)
                    self.assertIsNotNone(minutes, f"{path.name}: job '{name}' has no timeout-minutes")
                    self.assertLessEqual(minutes, 45)

    def test_the_browser_download_has_its_own_short_timeout(self):
        lines = jobs(WORKFLOWS / "ci.yml")["e2e"]
        install = next(i for i, line in enumerate(lines) if "playwright install" in line)
        step = lines[install - 3:install + 3]
        self.assertTrue(any(re.match(r"^\s+timeout-minutes:\s*\d+\s*$", line) for line in step),
                        "the playwright install step needs timeout-minutes")


if __name__ == "__main__":
    unittest.main()
