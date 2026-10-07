"""Promotion gate: main only accepts pull requests that come from dev of this same repository.

Usage: promotion_gate.py <base_ref> <head_ref> <head_repo> <this_repo>
Why: dev is where changes are reviewed and validated by the pipelines; main is what gets deployed. Forcing every
change through dev means production only ever receives code that already passed CI on dev. A fork's branch called
"dev" must not satisfy the gate, hence the repository comparison.
"""
import sys


def main(base, head, head_repo, this_repo):
    if base != "main":
        return 0
    if head == "dev" and head_repo == this_repo:
        return 0
    print(f"Blocked: pull requests into main must come from dev (got '{head_repo}:{head}'). "
          "Open the PR against dev first, then promote dev to main.")
    return 1


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(*sys.argv[1:]))
