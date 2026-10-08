"""Turns on auto-merge for a pull request opened in this repository.

Usage: auto_merge.py <repo> <pr_number> <draft:true|false> <head_repo> <labels comma-separated>
       (needs the `gh` CLI and GH_TOKEN in the environment)
Why: every change goes through a pull request and CI (ADR-0021); with auto-merge on, a PR merges by itself as soon as the
required checks pass, so nobody has to wait for CI and click. Drafts, forks and PRs labelled `no-auto-merge` are skipped.
The merge uses a merge commit so dev and main never diverge (ADR-0021).
"""
import subprocess
import sys

OPT_OUT_LABEL = "no-auto-merge"


def should_enable(draft, head_repo, this_repo, labels):
    return not draft and head_repo == this_repo and OPT_OUT_LABEL not in labels


def main(repo, number, draft, head_repo, labels):
    if not should_enable(draft == "true", head_repo, repo, [x for x in labels.split(",") if x]):
        print(f"Auto-merge not enabled on #{number} (draft, fork or '{OPT_OUT_LABEL}' label).")
        return 0
    subprocess.run(["gh", "pr", "merge", number, "--repo", repo, "--auto", "--merge"], check=True)
    print(f"Auto-merge enabled on #{number}.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 6:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(*sys.argv[1:]))
