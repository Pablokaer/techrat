# ADR-0026: Auto-merge on every pull request, and no "up to date" requirement on dev

**Status:** Accepted · Amends [ADR-0021](0021-dev-to-main-promotion-gate.md) (the "PRs into dev must be up to date" rule)
and builds on [ADR-0025](0025-automatic-dev-to-main-promotion.md)

## Context

ADR-0021 required pull requests into `dev` to be up to date with `dev` (`strict` status checks). With more than one
pull request open, every merge made the others `BEHIND`: someone had to update each branch and wait for the whole CI
again, one after another. Pull requests also waited for a manual click after CI had already passed.

## Options considered

1. **Keep `strict` and update branches by hand.** Safest per pull request, but a serial queue of manual work.
2. **GitHub merge queue.** The proper tool, but it is not available for a repository owned by a personal account.
3. **Drop `strict` on `dev` and turn on auto-merge everywhere.** CI still gates every merge; the cost is that two pull
   requests that pass alone can break together.

We chose **3**, because the risk is covered later in the flow (below).

## Decision

- Branch protection on `dev` no longer requires branches to be up to date (`strict: false` in
  `deploy/protection-dev.json`), the same as `main` already had.
- `.github/workflows/auto-merge.yml` enables auto-merge (merge commit) on every pull request opened in this repository,
  using the `PROMOTE_TOKEN` secret (a merge made with `GITHUB_TOKEN` would not trigger CI on `dev` nor the promotion).
  Drafts, forks and pull requests labelled `no-auto-merge` are skipped. Until the secret exists the workflow only warns.
- The repository setting "Allow auto-merge" is on.

## Consequences

- A pull request merges as soon as its four CI jobs are green; there is no human step between "CI passed" and `dev`.
  Review has to happen before CI finishes (comments, or the `no-auto-merge` label / a draft pull request for work that
  needs a second look). Required conversation resolution still blocks the merge.
- **The combined result is still validated:** CI runs on every push to `dev`, and the automatic `dev` → `main` pull
  request (ADR-0025) runs CI again on the merged state before anything reaches production. A semantic conflict between
  two merged pull requests therefore fails there and blocks the promotion instead of reaching production.
- Applying `protection-dev.json` is manual (commands in docs/deploy.md); the file and GitHub must be kept in sync.
- Adding the `no-auto-merge` label after auto-merge is already on does not turn it off; use `gh pr merge --disable-auto`.
