"""Auto-promotion: after CI passes on dev, open the dev -> main pull request and turn on auto-merge.

Usage: auto_promote.py <repo>      (needs the `gh` CLI and GH_TOKEN in the environment)
Why: promoting dev to main was a manual PR every time. Auto-merge keeps the safety of ADR-0021: GitHub only merges
once every required check (CI + promotion gate) passes on the pull request, so production still only receives code
that passed the pipelines. The merge uses a merge commit so dev and main never diverge.
"""
import json
import subprocess
import sys


def parse_ahead_by(payload):
    return int(json.loads(payload)["ahead_by"])


def parse_numbers(payload):
    return [item["number"] for item in json.loads(payload)]


def plan(ahead_by, open_numbers):
    """Returns (action, pull request number): skip, create (then merge) or merge an existing one."""
    if ahead_by == 0:
        return ("skip", None)
    if not open_numbers:
        return ("create", None)
    return ("merge", min(open_numbers))


def gh(*args):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout.strip()


def main(repo):
    ahead = parse_ahead_by(gh("api", f"repos/{repo}/compare/main...dev"))
    open_prs = parse_numbers(gh("pr", "list", "--repo", repo, "--base", "main", "--head", "dev", "--state", "open",
                                "--json", "number"))
    action, number = plan(ahead, open_prs)
    if action == "skip":
        print("dev has nothing new for main: nothing to promote.")
        return 0
    if action == "create":
        url = gh("pr", "create", "--repo", repo, "--base", "main", "--head", "dev",
                 "--title", "chore: promote dev to main",
                 "--body", f"Automatic promotion: CI passed on dev, which is {ahead} commit(s) ahead of main.\n\n"
                           "Auto-merge is enabled; it merges once the required checks pass (ADR-0025).")
        number = int(url.rstrip("/").rsplit("/", 1)[1])
        print(f"Opened {url}")
    gh("pr", "merge", str(number), "--repo", repo, "--auto", "--merge")
    print(f"Auto-merge enabled on #{number}.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
