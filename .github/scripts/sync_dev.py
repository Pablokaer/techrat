"""Sync dev with main after a promotion: fast-forward dev to main when that is possible.

Usage: sync_dev.py [repo_dir]      (run inside a clone whose `origin` can push to dev)
Why: promoting dev to main uses a merge commit (ADR-0025), which exists only on main, so dev always ends up a few
commits behind although the code is identical. Fast-forwarding dev to main brings that commit back without rewriting
history. If dev already has newer commits the fast-forward is impossible and nothing happens: the next promotion carries
main's merge commit along and the following sync catches dev up (ADR-0027).
"""
import subprocess
import sys


def plan(dev_is_ancestor, main_ahead_by):
    """Returns "fast-forward" or "skip"."""
    if main_ahead_by > 0 and dev_is_ancestor:
        return "fast-forward"
    return "skip"


def git(cwd, *args, check=True):
    return subprocess.run(["git", *args], cwd=cwd, check=check, capture_output=True, text=True)


def main(repo_dir="."):
    git(repo_dir, "fetch", "--quiet", "origin", "main", "dev")
    ahead = int(git(repo_dir, "rev-list", "--count", "origin/dev..origin/main").stdout.strip())
    dev_is_ancestor = git(repo_dir, "merge-base", "--is-ancestor", "origin/dev", "origin/main", check=False).returncode == 0
    action = plan(dev_is_ancestor, ahead)
    if action == "skip":
        print("dev is up to date with main, or has newer commits of its own: nothing to sync.")
        return 0
    git(repo_dir, "push", "origin", "origin/main:refs/heads/dev")  # no --force: refuses anything but a fast-forward
    print(f"dev fast-forwarded to main ({ahead} commit(s)).")
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(*sys.argv[1:]))
