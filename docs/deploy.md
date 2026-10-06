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

## Updating

Upload or pull the new code into `/opt/techrat` (the `.env` stays), then
`docker compose -f docker-compose.prod.yml up -d --build`. Migrations run automatically on start.

## Operations

- Logs: `docker compose -f docker-compose.prod.yml logs -f api` (JSON outside development), Apache logs in
  `/var/log/apache2/techrat-*.log`.
- Backup: `docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U techrat techrat | gzip > techrat-$(date +%F).sql.gz`
  daily via cron, copied off the server.
- The API trusts `X-Forwarded-For`/`X-Forwarded-Proto` only from private-network proxies (`ReverseProxy__Enabled=true`),
  so rate limits apply per real client.
- Security: prefer SSH keys over passwords for the server, keep `ufw` allowing only 22/80/443 if you enable it (the
  containers publish only on 127.0.0.1).
