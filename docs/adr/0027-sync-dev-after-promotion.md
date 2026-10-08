# ADR-0027: Fast-forward dev to main after each promotion

**Status:** Accepted · Builds on [ADR-0025](0025-automatic-dev-to-main-promotion.md)

## Context

Promotions merge `dev` into `main` with a merge commit (ADR-0021, ADR-0025). That commit exists only on `main`, so after
every promotion GitHub showed `dev` as N commits behind `main` even though the code was identical. Nothing was lost, but
the counter never reached zero and it was unclear whether the branches had really diverged.

## Options considered

1. **Accept the divergence.** Harmless, but noisy and it hides real divergence.
2. **A `main` → `dev` pull request after each promotion.** Merging it creates yet another merge commit, on `dev` this
   time, so the branches diverge again.
3. **Fast-forward `dev` to `main` from a workflow.** No new commit, no history rewrite, both branches end on the same SHA.

We chose **3**.

## Decision

- `.github/workflows/sync-dev.yml` runs on every push to `main` (and on manual dispatch) and calls
  `.github/scripts/sync_dev.py`, which pushes `origin/main` to `dev` without `--force`, only when `dev` is an ancestor of
  `main` and `main` is ahead.
- If `dev` already received newer commits, the script does nothing. The next promotion brings `main`'s merge commit back
  into `main`'s history, and the sync that follows catches `dev` up.
- It authenticates with `PROMOTE_TOKEN`. `dev` requires pull requests, so the token's owner must be on the bypass list of
  that protection rule (repository setting, one-time).
- The push to `dev` runs CI, then auto-promotion finds `dev` not ahead of `main` and skips: there is no loop.

## Consequences

- `dev` and `main` point to the same commit right after each promotion.
- `dev` now accepts a direct push from one automation; it can only ever be a fast-forward to `main`, so it cannot
  introduce code that did not go through a pull request.
- Without the bypass or the secret the workflow fails loudly and the branches simply stay diverged, as before.
