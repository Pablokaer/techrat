# ADR-0025: Automatic dev → main promotion

**Status:** Accepted · Amends [ADR-0021](0021-dev-to-main-promotion-gate.md) (the manual promotion step)

## Context

ADR-0021 requires every change to reach `main` through a pull request from `dev`, with CI and the promotion gate as
required checks. The maintainer opened that pull request by hand after every merge into `dev`, although nothing was
decided in that step: the pipelines already answered whether `dev` was fit to ship.

## Options considered

1. **Keep promoting by hand.** Safe, but repetitive and easy to forget, so `dev` and `main` drift apart.
2. **Push `dev` to `main` from a workflow.** Skips the pull request and the required checks, which branch protection
   forbids on purpose.
3. **A workflow opens the dev → main pull request and enables auto-merge.** Same protections as today; only the
   clicking is automated.

We chose **3**.

## Decision

- `.github/workflows/auto-promote.yml` runs when CI completes successfully for a push to `dev` (and on manual
  dispatch). `.github/scripts/auto_promote.py` opens a `dev` → `main` pull request when `dev` is ahead of `main` and none
  is open, then enables auto-merge with a **merge commit** (ADR-0021: squash or rebase would make the branches diverge).
- The merge itself is done by GitHub only when every required check passes on the pull request (the four CI jobs and
  `Promotion gate`). The gate script still comes from `main`, so the pull request cannot change its own gate.
- The workflow authenticates with a fine-grained personal access token (`PROMOTE_TOKEN`), not `GITHUB_TOKEN`: pull
  requests and merges made by `GITHUB_TOKEN` do not trigger other workflows, so the required checks would stay pending
  forever and the push to `main` would never start CI and Deploy.
- Repository setting "Allow auto-merge" must be on.

## Consequences

- Every green change on `dev` reaches production without a human step. The review point moves to the pull request into
  `dev`; there is no second look at the promotion. Pause the workflow (or switch auto-merge off) for a freeze.
- Several merges into `dev` in a row share one promotion pull request, which carries whatever `dev` holds when its checks
  finish; a failing check blocks everything on `dev` until a fix lands there.
- The token belongs to a person: it expires and stops working if that account loses access. When `PROMOTE_TOKEN` is
  missing or expired the workflow fails loudly and promotion falls back to opening the pull request manually.
