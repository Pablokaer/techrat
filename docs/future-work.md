# Future work: open items and scaling plan

The place to come back to. It lists what is **not done yet** in operations, delivery and infrastructure, and proposes a
staged path to a more professional system design that can take more traffic. Product features live in the README
("Next steps") and known limitations in the README ("Known limitations"); this file is about how the platform is run.

How to use it: when an item is done, delete it here and record the decision in an ADR (`docs/adr`) if it changed the
design. Keep new items short: what is missing, why it matters, a first step.

Written on 2026-10-08, from the repository as it is on `dev`. Nothing here has been load-tested: **there are no
measured capacity numbers**, so the stages below are triggered by signals, not by guessed user counts.

---

## 1. Open items (do these first)

### 1.1 Automatic dev → main promotion is not live yet

[ADR-0025](adr/0025-automatic-dev-to-main-promotion.md) is written, but the automation only works after two
settings that belong to the repository owner (details in [deploy.md](deploy.md#automatic-promotion-dev--main)):

- [ ] Enable **Allow auto-merge** (Settings → General).
- [ ] Create the `PROMOTE_TOKEN` secret (fine-grained PAT, this repository only, Contents + Pull requests read/write).
- [ ] Merge the PR that adds the workflow, then watch the first promotion end to end (PR opened, checks, merge, Deploy).

### 1.2 Rollback only covers code, during the deploy

Today (`deploy/deploy.sh`, ADR-0013): if the new version is not healthy, the previous commit is rebuilt. Missing:

- [ ] **Rollback on demand.** After a successful deploy there is no one-click way back to an older release. Add a
  `workflow_dispatch` input to Deploy (a commit sha or tag) so a bad release can be reverted in minutes without a
  revert PR through `dev` and `main`. `deploy.sh` already accepts a sha; the "must be the tip of `main`" check needs an
  explicit rollback mode.
- [ ] **Tag every release** (`git tag` on each deploy, or release notes) so "the last good version" is a name, not a
  search through history.
- [ ] **Database rollback is not covered.** Migrations run when the API starts and are never reversed, so a rollback
  of code against a migrated database only works if the migration is backward compatible (rule in ADR-0013, enforced
  by nothing). Options: a CI check that flags destructive operations in new migrations (drop/rename column or table,
  type change, `NOT NULL` without default); document the expand → migrate → contract pattern; restore from backup for
  the cases that cannot be undone.
- [ ] **Smoke test after deploy** beyond `/health/ready` and the web root: sign in with a monitoring account and
  fetch one roadmap, so "healthy but broken" releases also roll back automatically.

### 1.3 Backups are manual and unproven

`docs/deploy.md` only suggests a daily `pg_dump` by cron; the Play Store document admits that backup retention is not
defined, and the privacy policy depends on it.

- [ ] Scheduled backup (cron or a `postgres-backup` container) **before every deploy** and daily, copied **off the
  server** (object storage), with a retention period (for example 14 daily + 8 weekly).
- [ ] **Restore test**, written down and repeated (monthly). A backup that was never restored is a guess.
- [ ] State the retention in the privacy policy (links to the `TODO(legal)` markers in the README limitations).
- [ ] Later: continuous archiving (WAL) for point-in-time recovery, see stage 2.

### 1.4 Operational gaps found in the production compose file

`docker-compose.prod.yml` as it is today:

- [ ] **No resource limits** (`mem_limit`, `cpus`) on any service, so one runaway container (or an image build on the
  same host) can starve the other sites that share the VPS.
- [ ] **No log rotation** configured for the containers (Docker's default `json-file` driver has no size cap).
- [ ] **No monitoring or alerting documented.** OpenTelemetry is wired but `OTEL_EXPORTER_OTLP_ENDPOINT` is empty by
  default. Minimum: an external uptime check on `/health/ready` and the home page, disk/RAM/CPU alerts, and the
  Postgres connection count.
- [ ] **Images are built on the production server** (ADR-0013 option 3). Builds compete with live traffic and a failed
  build leaves the server half-updated. Move to images built in CI, pushed to a registry (GHCR) and pulled by the server.
- [ ] **Single point of failure everywhere** (one VPS, one Postgres, one API, one Apache shared with other sites). See
  section 2.

### 1.5 Known process gaps

- [ ] The integration tests (Testcontainers) need Docker; contributors without it only see them in CI. Document a
  no-Docker path (for example a `TECHRAT_TEST_DB` connection string to an existing PostgreSQL).
- [ ] Legal and store items still open are tracked in the README limitations and `docs/play-store/data-safety.md`.

---

## 2. Scaling plan: from one VPS to a system that holds more traffic

### 2.1 Where the system stands

```
Internet ─► Apache (shared with other sites) ─► web (Next.js, 1 container) ─► api (1 container) ─┬─► PostgreSQL (1, local volume)
                                              └► api /hubs (SignalR, 1)                          └─► Redis (cache only)
All on one VPS, built on that VPS.
```

What is already good for growth (keep it):

- **Stateless API with state in PostgreSQL.** Sessions, Data Protection keys, avatars, XP ledger and outbox are in the
  database, so more API instances are possible without sticky sessions for HTTP.
- **Outbox dispatcher is multi-instance safe** (`FOR UPDATE SKIP LOCKED`, ADR-0009).
- **Redis is a pure cache** and the API runs without it, so losing it only costs speed.
- **Migrations and seed are idempotent and guarded by an advisory lock**, so several instances can start together.
- **Answer flow is one transaction** and clients hold no business rules (ADR-0007), so the server side can be scaled
  and cached without touching the apps.

What blocks running more than one API instance **today** (verified in the code):

| Blocker | Where | Effect with N instances |
|---|---|---|
| Rate limiting is in memory per process (`AddRateLimiter`, fixed window / token bucket) | `TechRat.Api/Program.cs` | Each instance counts separately: the effective limit becomes N× and abuse protection weakens |
| SignalR has no backplane (`AddSignalR()` only) | `TechRat.Api/Program.cs` | A notification published on instance A never reaches a user connected to instance B |
| Migrations and seed run on every API start (`MigrateOnStartup`, `SeedOnStartup`) | `docker-compose.prod.yml` | Slower, riskier rolling restarts; a failed migration blocks every instance |
| Images built on the server, one `docker compose up` | `deploy/deploy.sh` | No rolling update: the API restarts as a whole, short downtime on each deploy |
| No explicit connection pool settings found in the configuration | API config | Npgsql's default pool (up to 100 per instance) × N instances can exhaust PostgreSQL's connections |

### 2.2 First: measure

Before buying anything, find out the real limits. A few hours of work, and it tells which stage below is needed.

- [ ] Load test with **k6** against a staging copy: sign in, list roadmaps, start a practice session, answer
  questions (the hot path: one transaction writing the attempt, XP, progress and streak), leaderboard reads.
  Record p50/p95/p99 latency and errors at 10, 50 and 200 concurrent users.
- [ ] Find the first bottleneck (API CPU, PostgreSQL write latency on the answer transaction, connections, memory).
- [ ] Turn on OpenTelemetry export and slow-query logging (`pg_stat_statements`) so production tells the same story.
- [ ] Write the numbers in this file and set service level objectives (for example 99.5% of answers under 500 ms).

### 2.3 Stage 0: cheap hardening on the same VPS (no new servers)

Do this regardless of traffic. Goal: stop losing data and stop one container from hurting the rest.

- [ ] Backups, restore test, resource limits, log rotation, uptime alerts (sections 1.3 and 1.4).
- [ ] **HTTP caching and compression:** long `Cache-Control` on Next.js static assets (`/_next/static`, fingerprinted),
  gzip/brotli in Apache, and `Cache-Control` + `ETag` on read-only catalog endpoints (roadmaps, modules, topics).
- [ ] **PostgreSQL tuning** for the VPS size (`shared_buffers`, `work_mem`, `max_connections`), indexes verified against
  the slow-query list, `autovacuum` watched on the hot tables (`question_attempts`, `xp_transactions`).
- [ ] **Connection pool limits** set explicitly (`Maximum Pool Size`), sized from PostgreSQL's `max_connections`.
- [ ] **Registry images** built in CI (also fixes the build-on-server problem).

### 2.4 Stage 1: separate the pieces, add a CDN (still simple)

Trigger: CPU or RAM of the VPS above ~60% at peak, or Apache/other sites suffer from TechRat.

- [ ] **Dedicated server (or managed service) for TechRat**, no longer sharing with unrelated sites.
- [ ] **Managed PostgreSQL** (or a separate host) with automated backups and point-in-time recovery. The database is
  the component that hurts most to lose and to scale, so it is the first one to move.
- [ ] **CDN in front** (Cloudflare or similar): TLS, DDoS and bot protection, caching of static assets and avatars
  (they already have versioned URLs, ADR-0017), a WAF rule set, and a place to rate limit before traffic reaches the VPS.
- [ ] **Staging environment** identical to production (same compose, own database) so migrations and the load test
  run somewhere that is not production.
- [ ] **Zero-downtime deploy for the web and API** (start the new container, wait for health, switch the proxy, stop
  the old one) instead of `up -d` restarting in place.

### 2.5 Stage 2: horizontal scale of the API

Trigger: the load test shows API CPU as the bottleneck, or a single instance is a risk you cannot accept.

- [ ] **2+ API instances behind a load balancer** (Caddy/Traefik/nginx or a cloud LB) with health-based routing.
- [ ] **SignalR Redis backplane** (`Microsoft.AspNetCore.SignalR.StackExchangeRedis`) so notifications reach users on
  any instance; keep WebSockets only (skip negotiation fallbacks) to avoid sticky sessions.
- [ ] **Distributed rate limiting** keyed in Redis (or enforced at the CDN/load balancer), replacing the in-memory
  limiter, so limits stay correct with N instances.
- [ ] **Migrations as a separate one-shot job** run before the new version starts (`MigrateOnStartup=false` on the
  instances), and the seed as an explicit step. Use the expand → migrate → contract pattern (section 1.2).
- [ ] **PgBouncer** (transaction pooling) between the API and PostgreSQL once the instance count makes connections the limit.
- [ ] **Read replica** for read-heavy endpoints (catalog, leaderboards, profiles), with the answer transaction staying on the primary.
- [ ] **Cache the hot reads deliberately:** leaderboards and catalog in Redis with short TTLs and explicit invalidation
  from the outbox events that already exist; the home dashboard per user with a short TTL. Measure hit rate.
- [ ] **Redis with persistence or replication** only if something starts depending on it beyond cache (rate limit
  counters can be lost safely; a lost cache must stay harmless).

### 2.6 Stage 3: scale the heavy paths independently

Trigger: one workload (answers, leaderboard rebuilds, emails, notifications) dominates and hurts the others.

- [ ] **Separate worker process** for the outbox dispatcher and background jobs (same codebase, started with a flag),
  so a burst of achievements or emails does not compete with request handling. The `SKIP LOCKED` design already allows it.
- [ ] **Message broker** (the README already names Azure Service Bus; RabbitMQ or a managed queue works too) when there
  are several consumers, replacing outbox polling with push delivery.
- [ ] **Leaderboards from precomputed snapshots** (rank tables refreshed by the worker, or Redis sorted sets) instead
  of aggregating `xp_transactions` on read.
- [ ] **Partition or archive** the largest append-only tables (`question_attempts`, `xp_transactions`, outbox history) by
  month when they reach hundreds of millions of rows or vacuum becomes a problem.
- [ ] **Container orchestration** (managed Kubernetes, Azure Container Apps as in the README plan, or ECS/Fly) only when
  there are several services to run, autoscaling is needed, or the team grows. A well-run Compose host is cheaper and
  simpler until then; do not adopt orchestration for its own sake.

### 2.7 Cross-cutting: what makes it "professional"

- [ ] **Infrastructure as code** (Terraform/OpenTofu or Ansible) for the server, DNS, CDN and secrets, so the
  environment can be rebuilt from the repository, not from memory.
- [ ] **Secrets management:** move `.env` on disk to a secret store (Key Vault, SOPS, Doppler); rotate the deploy key,
  `PROMOTE_TOKEN` and the admin password on a schedule.
- [ ] **Runbooks** in `docs/`: deploy fails, rollback, restore from backup, database full, certificate expired,
  incident template and a post-mortem habit.
- [ ] **Observability dashboards and alerts:** request rate, error rate, latency per endpoint, outbox queue depth and
  age (the early warning that the worker is behind), PostgreSQL connections and replication lag, Redis hit rate.
- [ ] **Disaster recovery targets:** write the RPO (how much data may be lost) and RTO (how long to be back) and check
  that backups and the restore runbook meet them.
- [ ] **Security hardening:** WAF at the CDN, dependency and image scanning in CI, regular `ufw`/SSH review (key-only
  already recommended in `docs/deploy.md`).
- [ ] **Cost review** at each stage: the cheapest design that meets the objectives wins.

### 2.8 Suggested order

1. Section 1 (auto-promotion live, rollback on demand, backups with a restore test, compose limits, alerts).
2. Load test (2.2), which decides what follows.
3. Stage 0, then Stage 1 (managed database and CDN give the largest risk reduction per euro).
4. Stage 2 only when the numbers ask for it. Stage 3 only when a specific workload hurts.

Each stage that changes the design gets its own ADR, and each item its own branch and PR (see "Git workflow" in
`CLAUDE.md`).
