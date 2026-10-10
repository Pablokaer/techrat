# Deploying TechRat to a VPS

TechRat runs as a Docker Compose stack (`docker-compose.prod.yml`) behind a reverse proxy that terminates HTTPS.
The production VPS already hosts other sites with **Apache**, so TechRat is added as one more Apache virtual host and
never takes ports 80/443 itself.

```
Internet ─► Apache :80/:443 (Let's Encrypt via certbot)
              ├─ techrat.io /hubs/*  ─► 127.0.0.1:5080  api   (SignalR, websocket upgrade)
              └─ techrat.io /*       ─► 127.0.0.1:3000  web   (Next.js; proxies /api to the api container)
           Docker network: api ─ postgres ─ redis   (no host ports)
```

## Requirements

- Ubuntu with Docker Engine + Compose v2, Apache 2.4.47+ with certbot (`python3-certbot-apache`).
- DNS: `A` records for `@` and `www` pointing to the VPS (no stale `AAAA`).
- ~2 GB free RAM for the containers (images are built on the server).

## First deployment

1. Copy the code to `/opt/techrat` (git clone, or upload a `git archive` of a release).
2. Create `/opt/techrat/.env` from `.env.production.example` (`chmod 600`): strong `POSTGRES_PASSWORD` and
   `ADMIN_PASSWORD` (`openssl rand -base64 32`), `ADMIN_EMAIL`, `PUBLIC_WEB_URL=https://<domain>` and the SMTP settings
   (`docs/email.md`).
3. Start the stack: `docker compose -f docker-compose.prod.yml up -d --build`. The API applies migrations and the seed on
   start (idempotent, guarded by an advisory lock). Check: `curl -s 127.0.0.1:5080/health/ready` → `Healthy`.
4. Apache: copy `deploy/apache/techrat.conf` to `/etc/apache2/sites-available/`, adjust the domain, then
   `a2enmod proxy proxy_http headers rewrite`, `a2ensite techrat`, `apache2ctl configtest` and `systemctl reload apache2`.
   `configtest` must pass before reloading: other sites share this Apache.
5. HTTPS: `certbot --apache -d <domain> -d www.<domain> --redirect`. Renewal uses the existing certbot timer.
6. Sign in with the admin account, change its password, and use **Admin → Send test email**.

## Encrypt the login keys (recommended)

The API signs and encrypts login cookies and bearer tokens with keys stored in PostgreSQL. Without a certificate they sit
there as plain XML, so a leaked database backup would let someone forge a session for any account
([ADR-0029](adr/0029-login-security-hardening.md)). Create a certificate **outside the repository and the database** and give it
to the API:

```bash
PFX_PASSWORD="$(openssl rand -base64 24)"        # keep it: it is DATAPROTECTION_CERT_PASSWORD
openssl req -x509 -newkey rsa:3072 -nodes -keyout dp-key.pem -out dp-cert.pem -days 3650 -subj "/CN=techrat-dataprotection"
openssl pkcs12 -export -inkey dp-key.pem -in dp-cert.pem -out dp.pfx -password "pass:$PFX_PASSWORD"
base64 -w0 dp.pfx                                 # value of DATAPROTECTION_CERT_BASE64
shred -u dp-key.pem dp.pfx
```

Put `DATAPROTECTION_CERT_BASE64` and `DATAPROTECTION_CERT_PASSWORD` in the server's `.env` and redeploy. The API refuses to
start when they are set but wrong; when they are missing it logs a warning. New keys are encrypted from then on; keys already in
the database stay readable until they rotate (up to 90 days). To encrypt immediately, delete the rows of `DataProtectionKeys`
(everyone has to sign in again). Keep the certificate: losing it makes the stored keys unreadable, which also signs everyone out.

## Updating: continuous deployment

### Branch flow and promotion gate

```
feature branch ─PR─► dev ─(CI green, merged)─► PR dev ─► main ─(CI + promotion gate)─► merge ─► Deploy
```

Every change lives in its own short-lived branch cut from `dev`, with one pull request into `dev`; the repository
deletes the branch when the PR is merged (Settings → General → *Automatically delete head branches*, already on).

Nothing is pushed straight to `dev` or `main`: both are protected and only change through pull requests
([ADR-0021](adr/0021-dev-to-main-promotion-gate.md)). A PR into `dev` needs the CI checks; a PR into `main` must come
from `dev` (check *Promotion gate*) and pass CI again. Use a merge commit when promoting dev to main. Protection is
configured in GitHub (Settings → Branches), reproduced by:

```
gh api -X PUT repos/Pablokaer/techrat/branches/dev/protection --input deploy/protection-dev.json
gh api -X PUT repos/Pablokaer/techrat/branches/main/protection --input deploy/protection-main.json
```

### Auto-merge on every pull request

Every pull request opened in the repository gets auto-merge (merge commit) from `.github/workflows/auto-merge.yml`
([ADR-0026](adr/0026-auto-merge-and-no-strict-dev.md)), so it merges by itself once its checks pass, and `dev` no longer
requires branches to be up to date. Opt out with a draft pull request or the `no-auto-merge` label. It needs the same
setup as the promotion below (**Allow auto-merge** and the `PROMOTE_TOKEN` secret); without the secret it only warns.

### Automatic promotion (dev → main)

Nobody opens the dev → main pull request by hand ([ADR-0025](adr/0025-automatic-dev-to-main-promotion.md)). When CI
passes on a push to `dev`, `.github/workflows/auto-promote.yml` runs `.github/scripts/auto_promote.py`: if `dev` is ahead
of `main` it opens the PR (or reuses the open one) and enables **auto-merge with a merge commit**. GitHub merges it once
the required checks (CI + promotion gate) pass on that PR, and the merge deploys. One-time setup:

1. Settings → General → Pull Requests → enable **Allow auto-merge**
   (`gh api -X PATCH repos/Pablokaer/techrat -f allow_auto_merge=true`).
2. Create a fine-grained personal access token for this repository (Contents and Pull requests: read and write) and
   store it as the repository secret `PROMOTE_TOKEN` (`gh secret set PROMOTE_TOKEN`). `GITHUB_TOKEN` cannot be used:
   what it creates or merges does not trigger other workflows, so the checks and Deploy would never run.

To pause promotion, disable the workflow in the Actions tab; to promote on demand, run it with *Run workflow*.

#### Keeping dev in sync with main

The promotion merge commit exists only on `main`, so `dev` would always look a few commits behind. After every push to
`main`, `.github/workflows/sync-dev.yml` runs `.github/scripts/sync_dev.py`, which fast-forwards `dev` to `main` (never
forced, skipped if `dev` has newer commits; [ADR-0027](adr/0027-sync-dev-after-promotion.md)). One-time setup: the owner
of `PROMOTE_TOKEN` must be allowed to bypass the "changes must be made through a pull request" rule on `dev`
(Settings → Rules / Branches → add the account or app to the bypass list).

### Deploy

Every push to `main` (that is, every dev → main promotion) goes live by itself once CI is green:

```
push to main ─► CI (.github/workflows/ci.yml) ─► success ─► Deploy (.github/workflows/deploy.yml)
                                                              └─ ssh root@VPS "<sha>" ─► /opt/techrat/deploy/deploy.sh
```

`deploy/deploy.sh` runs on the server: it fetches `origin/main`, checks out the tested commit (skipped when a newer
commit is already on `main`, whose own run will deploy it), runs `docker compose -f docker-compose.prod.yml up -d --build`,
waits until `127.0.0.1:5080/health/ready` and `127.0.0.1:3000` answer, and prunes old TechRat images. If the new
version is not healthy it checks out and rebuilds the previous commit and the workflow fails. Migrations run on API
start. The untracked `/opt/techrat/.env` is never touched. Log: `/var/log/techrat-deploy.log`.

- **Manual deploy:** GitHub → Actions → Deploy → *Run workflow* (tip of `main`), or on the server
  `bash /opt/techrat/deploy/deploy.sh`.
- **Server setup (once):** `/opt/techrat` is a clone of the public repository
  (`git clone https://github.com/Pablokaer/techrat.git /opt/techrat`, then create `.env`). A dedicated key pair is
  used only by GitHub Actions; its public key is in `/root/.ssh/authorized_keys` restricted to the script:
  `command="bash /opt/techrat/deploy/deploy.sh",restrict ssh-ed25519 AAAA… techrat-github-deploy`. The client's
  command is only read as a commit sha (anything else is rejected), so a leaked key can do nothing but redeploy `main`.
- **Repository secrets** (Settings → Secrets and variables → Actions): `VPS_HOST` (server IP), `VPS_SSH_KEY` (the
  private deploy key), `VPS_KNOWN_HOSTS` (output of `ssh-keyscan <ip>`, pins the server's host key).
- **Turn it off:** disable the Deploy workflow in GitHub Actions, or remove the key line from `authorized_keys`.

## Operations

- Logs: `docker compose -f docker-compose.prod.yml logs -f api` (JSON outside development), Apache logs in
  `/var/log/apache2/techrat-*.log`.
- Backup: `docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U techrat techrat | gzip > techrat-$(date +%F).sql.gz`
  daily via cron, copied off the server.
- The API trusts `X-Forwarded-For`/`X-Forwarded-Proto` only from private-network proxies (`ReverseProxy__Enabled=true`),
  so rate limits apply per real client.
- Security: prefer SSH keys over passwords for the server, keep `ufw` allowing only 22/80/443 if you enable it (the
  containers publish only on 127.0.0.1).
