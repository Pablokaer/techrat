# ADR-0013: Continuous deployment to the VPS over a restricted SSH key

**Status:** Accepted

## Context

Production runs on a single VPS that also hosts other sites (Apache, other apps, a system PostgreSQL). The stack is
`docker-compose.prod.yml`, built on the server. Deploys were manual (upload an archive, rebuild), so a merge to `main`
did not reach https://techrat.io until someone ran them. The other sites must never be disturbed, and the server's
SSH is key-only.

## Options considered

1. **Manual deploys (status quo).** No moving parts, but `main` and production drift apart.
2. **Build images in GitHub Actions, push to a registry, pull on the server.** Faster deploys and no build load on the
   server, but adds a registry, credentials on both sides and image tagging.
3. **GitHub Actions triggers a build on the server over SSH.** Reuses the existing compose build; the server pulls the
   public repository itself.
4. **Polling on the server (cron + `git pull`).** No inbound credentials, but no link to CI status and slower feedback.

We chose **3**. It is the smallest step from the manual process and keeps CI as the gate.

## Decision

- `.github/workflows/deploy.yml` runs on `workflow_run` of CI, only for successful `push` runs on `main` (and on
  manual dispatch). It SSHes in with a dedicated deploy key and passes the tested commit sha; runs are serialized.
- The deploy key's `authorized_keys` line uses `command="bash /opt/techrat/deploy/deploy.sh",restrict`: the key
  cannot open a shell, forward ports or run anything else. The script accepts only a 40-hex sha (or nothing).
- `deploy/deploy.sh` fetches `origin/main`, deploys only if the sha is still the tip (an older CI run finishing late
  is skipped), rebuilds with compose, waits for the API readiness and web endpoints, and on failure checks out and
  rebuilds the previous commit and exits non-zero. Untracked `.env` is preserved; only TechRat-labelled dangling
  images are pruned. It is tested in CI with a throwaway repo and fake `docker`/`curl`.
- The host key is pinned (`VPS_KNOWN_HOSTS` secret, `StrictHostKeyChecking=yes`).

## Consequences

- Every green push to `main` is live a few minutes later; a broken build or failed health check leaves the previous
  version running.
- Images are still built on the server (CPU/RAM spike during deploys, short restart of the web and API).
- Rollback covers code only: migrations are applied on API start and are not reversed, so migrations must stay
  backward compatible with the previous release.
- If the registry route (option 2) becomes worth it, only the workflow and `deploy.sh` change.
