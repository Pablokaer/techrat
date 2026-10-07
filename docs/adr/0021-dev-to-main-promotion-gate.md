# ADR-0021: Promotion gate — feature → dev → main → deploy

**Status:** Accepted · Builds on the continuous deployment described in docs/deploy.md

## Context

Every push to `main` is deployed to production once CI is green. Until now changes could reach `main` directly or by
a pull request from any branch, so nothing guaranteed that a change had been integrated and validated before going
live.

## Decision

- **Two long-lived branches.** `dev` is the integration branch, `main` is production.
  `feature branch ─PR─► dev ─PR─► main ─► Deploy`.
- **Pull requests only, never direct pushes**, on both branches (branch protection, enforced for admins as well).
  No force pushes, no deletion, conversations must be resolved, PRs into dev must be up to date with dev (not required on main: a merge-commit promotion makes main ahead of dev, which would otherwise force a back-merge every time).
- **dev:** the four CI jobs (backend, frontend, end-to-end, docker images) must pass on the PR. CI also runs on every
  push to dev, so the merged result is validated again.
- **main:** the same CI checks plus the `Promotion gate (main accepts only dev)` check
  (`.github/workflows/promotion-gate.yml`, script `.github/scripts/promotion_gate.py`): the PR head must be `dev` of
  this repository (a fork's `dev` does not count). The script is checked out from the base branch, so a PR cannot
  change its own gate.
- **Deploy is unchanged:** it runs only when CI succeeds on a push to `main`, i.e. after a dev → main merge.
- **Approvals:** zero required reviews, because the project has a single maintainer who cannot approve their own PR.
  The review step is the PR itself (merging is the approval). Raise `required_approving_review_count` when a second
  reviewer joins.

## Consequences

- Hotfixes also go through dev. The cost is one extra PR; the benefit is that production only receives code that has
  already passed the pipelines on dev.
- Merge dev into main with a **merge commit** (not squash/rebase), otherwise dev and main diverge and the next
  promotion conflicts.
- Branch protection lives in GitHub settings, not in git. If the repository is recreated, re-apply it (commands in
  docs/deploy.md).
