# TechRat — Learn › Practice › Level Up

TechRat is a gamified platform for studying technology and preparing for tech jobs. Learners answer questions, follow roadmaps, earn XP, level up globally and per topic, keep streaks, unlock badges and climb leaderboards. The content runs from programming fundamentals to system design, AI engineering, cloud and DevOps.

This repository holds a working MVP: an ASP.NET Core 10 API, a responsive Next.js web app, an Expo mobile app and a Tauri desktop app. All the clients share one API and one set of generated contracts.

| | |
|---|---|
| Knowledge tree | Topics and subtopics from programming fundamentals to AI, cloud and leadership (see [Catalog](#catalog)) |
| Question bank | Multiple-choice questions in four difficulties (counts in [Catalog](#catalog)). Every subtopic used by a roadmap has at least 6 questions. Every question has 4 options, exactly 1 correct answer, an explanation and an official reference URL. |
| Roadmaps | Learning paths made of modules and steps, with prerequisites (full list in [Catalog](#catalog)). |
| Gamification | XP ledger, progressive levels (global + per topic), streaks, 24 achievements/badges, daily challenge, Global/Weekly/Monthly/Topic leaderboards |
| Languages | English and Brazilian Portuguese (web + desktop): the whole UI, plus topic, roadmap and achievement names, server messages and emails. Questions are English-only for now. |

<!-- catalog:start -->
## Catalog

_Generated from the seed data by `python3 scripts/seed-src/readme_catalog.py`. Do not edit by hand; CI fails when it is out of date._

### Questions

**1,707** multiple-choice questions: Easy 500 · Medium 623 · Hard 418 · Expert 166.

<details><summary>Questions per topic</summary>

| Topic | Category | Subtopics | Questions |
|---|---|---:|---:|
| Programming Fundamentals | Computer Science | 11 | 66 |
| Data Structures | Computer Science | 13 | 78 |
| Algorithms | Computer Science | 16 | 96 |
| System Design | Architecture | 16 | 102 |
| Backend Engineering | Engineering | 8 | 48 |
| Databases | Data | 10 | 60 |
| C# | Languages | 12 | 72 |
| .NET | Frameworks | 9 | 54 |
| JavaScript | Languages | 9 | 54 |
| TypeScript | Languages | 7 | 42 |
| Frontend Engineering | Engineering | 9 | 54 |
| React | Frameworks | 11 | 66 |
| Python | Languages | 10 | 60 |
| Java | Languages | 8 | 48 |
| Git | Tools | 7 | 42 |
| Operating Systems | Computer Science | 6 | 36 |
| Computer Networking | Computer Science | 9 | 54 |
| Security | Security | 10 | 60 |
| Testing & Quality | Engineering | 7 | 42 |
| Clean Code & Software Design | Engineering | 6 | 29 |
| Design Patterns | Engineering | 5 | 27 |
| Software Architecture | Architecture | 9 | 54 |
| DevOps | Cloud & DevOps | 6 | 36 |
| Docker | Cloud & DevOps | 7 | 42 |
| Kubernetes | Cloud & DevOps | 8 | 48 |
| Cloud Engineering | Cloud & DevOps | 9 | 54 |
| Azure | Cloud & DevOps | 6 | 36 |
| AI Engineering | AI & Data | 10 | 60 |
| Machine Learning | AI & Data | 9 | 54 |
| Data Engineering | AI & Data | 7 | 42 |
| Observability | Cloud & DevOps | 5 | 30 |
| Performance Engineering | Engineering | 6 | 25 |
| Engineering Leadership | Career | 6 | 36 |

</details>

### Roadmaps

**32** roadmaps · 111 modules · 394 steps.

| # | Roadmap | Português | Category | Difficulty | Modules | Steps | Estimate | Questions | Prerequisites |
|---:|---|---|---|---|---:|---:|---:|---:|---|
| 1 | Computer Science Fundamentals | Fundamentos de Ciência da Computação | Computer Science | Beginner | 4 | 16 | 8 h | 96 | — |
| 2 | Data Structures and Algorithms | Estruturas de Dados e Algoritmos | Computer Science | Intermediate | 6 | 29 | 22 h | 174 | Computer Science Fundamentals (50%) |
| 3 | Operating Systems | Sistemas Operacionais | Computer Science | Intermediate | 3 | 7 | 5 h | 42 | — |
| 4 | Computer Networking | Redes de Computadores | Computer Science | Intermediate | 3 | 9 | 7 h | 54 | — |
| 5 | Git and Collaboration | Git e Colaboração | Tools | Beginner | 3 | 8 | 4 h | 48 | — |
| 6 | C# Developer | Desenvolvedor C# | Languages | Intermediate | 3 | 12 | 9 h | 72 | — |
| 7 | Python Developer | Desenvolvedor Python | Languages | Beginner | 2 | 10 | 5 h | 60 | — |
| 8 | Java Developer | Desenvolvedor Java | Languages | Intermediate | 2 | 8 | 6 h | 48 | — |
| 9 | JavaScript Developer | Desenvolvedor JavaScript | Languages | Beginner | 2 | 9 | 4 h | 54 | — |
| 10 | TypeScript Developer | Desenvolvedor TypeScript | Languages | Intermediate | 2 | 7 | 5 h | 42 | JavaScript Developer (50%) |
| 11 | Frontend Developer | Desenvolvedor Frontend | Web Development | Intermediate | 4 | 17 | 13 h | 102 | — |
| 12 | React Developer | Desenvolvedor React | Web Development | Intermediate | 3 | 11 | 8 h | 66 | JavaScript Developer (50%) |
| 13 | Backend Developer | Desenvolvedor Backend | Web Development | Intermediate | 5 | 19 | 14 h | 114 | — |
| 14 | .NET Backend Developer | Desenvolvedor Backend .NET | Web Development | Intermediate | 4 | 12 | 9 h | 72 | C# Developer (50%) |
| 15 | Full Stack Developer | Desenvolvedor Full Stack | Web Development | Intermediate | 4 | 14 | 10 h | 84 | JavaScript Developer (30%) |
| 16 | Database Engineering | Engenharia de Bancos de Dados | Data | Intermediate | 3 | 11 | 8 h | 66 | — |
| 17 | System Design | System Design | Architecture | Advanced | 7 | 22 | 22 h | 138 | Data Structures and Algorithms (30%), Backend Developer (30%) |
| 18 | Software Architecture | Arquitetura de Software | Architecture | Advanced | 4 | 16 | 16 h | 96 | — |
| 19 | Testing and Quality Engineering | Engenharia de Testes e Qualidade | Engineering | Intermediate | 2 | 7 | 5 h | 42 | — |
| 20 | Security Fundamentals | Fundamentos de Segurança | Security | Intermediate | 2 | 10 | 8 h | 60 | — |
| 21 | Docker | Docker | Cloud & DevOps | Beginner | 2 | 7 | 4 h | 42 | — |
| 22 | Kubernetes | Kubernetes | Cloud & DevOps | Advanced | 2 | 8 | 8 h | 48 | Docker (50%) |
| 23 | DevOps Engineer | Engenheiro DevOps | Cloud & DevOps | Intermediate | 4 | 13 | 10 h | 78 | — |
| 24 | Cloud Engineering | Engenharia de Cloud | Cloud & DevOps | Intermediate | 3 | 9 | 7 h | 54 | — |
| 25 | Azure Developer | Desenvolvedor Azure | Cloud & DevOps | Intermediate | 2 | 6 | 4 h | 36 | Cloud Engineering (30%) |
| 26 | AWS Fundamentals | Fundamentos de AWS | Cloud & DevOps | Beginner | 2 | 6 | 3 h | 36 | — |
| 27 | AI Engineering | Engenharia de IA | AI & Data | Advanced | 5 | 11 | 11 h | 66 | Python Developer (30%) |
| 28 | Machine Learning | Machine Learning | AI & Data | Advanced | 3 | 9 | 9 h | 54 | — |
| 29 | Data Engineering | Engenharia de Dados | AI & Data | Intermediate | 3 | 8 | 6 h | 48 | — |
| 30 | Junior Software Engineer | Engenheiro de Software Júnior | Career | Beginner | 7 | 23 | 12 h | 138 | — |
| 31 | Senior Software Engineer | Engenheiro de Software Sênior | Career | Expert | 6 | 23 | 29 h | 144 | System Design (30%) |
| 32 | Technical Interview Preparation | Preparação para Entrevistas Técnicas | Career | Advanced | 4 | 17 | 17 h | 108 | — |
<!-- catalog:end -->

---

## Architecture

```
            ┌───────────── Next.js web (cookie auth, /api proxy) ─────────────┐
            │            Tauri desktop (static export, bearer tokens)         │
 Clients ───┤            Expo mobile (bearer tokens, SecureStore)             │
            └───────────── generated OpenAPI types (@techrat/types) ──────────┘
                                         │ HTTPS / JSON · SignalR
┌────────────────────────── TechRat.Api (ASP.NET Core 10) ──────────────────────────┐
│ Identity · Users · Topics · Questions · Practice/Answers · Roadmaps · Progress ·   │
│ Gamification (XP, Levels, Achievements, Streaks) · Leaderboards · Analytics ·      │
│ Notifications · Administration          — modular monolith (ADR-0001)             │
│ Outbox dispatcher (BackgroundService) · OpenTelemetry · Health checks · Rate limit │
└───────────────┬───────────────────────────────────────┬──────────────────────────┘
          PostgreSQL 17 (source of truth)          Redis 7 (cache only)
```

* **Backend:** a modular monolith. `Domain` holds the entities and pure rules, `Application` the use cases, `Infrastructure` EF Core, Redis, the outbox, email and seed, `Modules` the HTTP endpoints and `Api` the host. All business rules live in the backend (ADR-0007).
* **Answer flow:** grading, the attempt, the XP ledger, user and topic progress, the streak and roadmap steps are written in **one transaction**. Achievements, the rank snapshot and realtime notifications go through a **transactional outbox** (ADR-0009).
* **Auth:** ASP.NET Core Identity. The web app uses an HttpOnly cookie. Mobile and desktop use bearer and refresh tokens (ADR-0008).

Architecture decisions are documented in [`docs/adr`](docs/adr).

## Repository structure

```
apps/
  web/        Next.js 16 + Tailwind 4 + React Query + Recharts (also the desktop UI)
  mobile/     Expo SDK 57 / React Native (expo-router)
  desktop/    Tauri 2 shell around the web static export
packages/
  types/      generated OpenAPI contracts (schema.d.ts) + friendly aliases
  api/        typed API client (openapi-fetch) + ApiError
  auth/       BearerSession (login, single-flight refresh, logout) + TokenStorage
  validation/ zod schemas mirroring server rules
  theme/      design tokens (colors, difficulty/tier colors, radii, fonts)
  ui/         small shared web primitives (ProgressBar, DifficultyBadge, …)
backend/
  TechRat.Domain · TechRat.Application · TechRat.Infrastructure · TechRat.Modules · TechRat.Api · TechRat.Tests
  TechRat.Infrastructure/Seed/Data   topics.json · roadmaps.json · achievements.json · questions/*.json
e2e/          Playwright end-to-end tests
scripts/      seed sources and validator, OpenAPI client generation, dev helpers
docs/adr/     architecture decision records
```

## Prerequisites

* Docker with Compose v2. This is enough to run everything.
* For local development: .NET SDK 10, Node 22 and npm 10. Rust and the Tauri prerequisites are only needed for desktop builds.

## Quick start (Docker)

```bash
cp .env.example .env          # optional: set ADMIN_EMAIL / ADMIN_PASSWORD to bootstrap an admin
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API + OpenAPI UI | http://localhost:5080/docs (spec: `/openapi/v1.json`) |
| Health | http://localhost:5080/health/live · `/health/ready` |
| Mailpit (password-reset emails) | http://localhost:8025 |

On first start the API applies the migrations and runs the seed. The seed is idempotent and runs under a PostgreSQL advisory lock.

If you build behind a TLS-inspecting corporate proxy, set `EXTRA_CA_CERT=/path/to/ca.crt`. It is passed to the image builds as a BuildKit secret.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `ConnectionStrings__Postgres` | API | PostgreSQL connection (required) |
| `ConnectionStrings__Redis` | API | Redis. If empty, an in-memory cache is used |
| `Database__MigrateOnStartup` / `Database__SeedOnStartup` | API | Apply migrations and seed at startup |
| `Seed__AdminEmail` / `Seed__AdminPassword` | API | Optional bootstrap admin (Compose: `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| `Cors__AllowedOrigins__N` | API | Allowed origins (web, Tauri, Expo web) |
| `Smtp__Host`, `Smtp__Port`, `Smtp__Username`, `Smtp__Password`, `Smtp__From` | API | Email delivery (Mailpit locally) |
| `App__PublicWebUrl` | API | Base URL for password-reset links |
| `Gamification__*` | API | XP values, level curve, step criteria, daily challenge (see `appsettings.json`) |
| `RateLimiting__AuthPerMinute` / `RateLimiting__AnswersPerMinute` | API | Rate limits (Compose: `AUTH_RATE_LIMIT_PER_MINUTE`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | API | Enables OTLP export of traces and metrics |
| `API_INTERNAL_URL` | web (build) | Backend URL the Next.js proxy forwards to |
| `NEXT_PUBLIC_AUTH_MODE`, `NEXT_PUBLIC_API_URL` | desktop build | `bearer` mode and API URL for the static export |
| `EXPO_PUBLIC_API_URL` | mobile | API URL for the Expo app |

No secrets are committed. `.env.example` contains placeholders only, and the development defaults are limited to `docker-compose.yml` and `appsettings.Development.json`.

## Local development

```bash
# 1. infrastructure
docker compose up -d postgres redis mailpit
# 2. API (Development profile: migrates + seeds automatically) → http://localhost:5080
cd backend && dotnet run --project TechRat.Api --urls http://localhost:5080
# 3. web → http://localhost:3000
npm install && npm run dev:web
```

### Database and migrations

```bash
cd backend
dotnet tool restore
dotnet ef migrations add <Name> -p TechRat.Infrastructure -s TechRat.Infrastructure -o Persistence/Migrations
dotnet ef database update -p TechRat.Infrastructure -s TechRat.Infrastructure   # or rely on MigrateOnStartup
```

### Seed content

The seed sources live in `scripts/seed-src`. `topics.py` and `roadmaps.py` generate the JSON files, and `QUESTION_AUTHORING.md` contains the question rules.

```bash
python3 scripts/seed-src/topics.py
python3 scripts/seed-src/roadmaps.py
python3 scripts/seed-src/validate_questions.py   # schema, 4 options, 1 correct, unique ids/text, valid topic/subtopic, https refs
```

The seed only inserts records that are missing, matched by slug, external key or code. Restarts never duplicate data, and edits made in the admin area are kept.

### Regenerating API contracts

```bash
npm run generate:api      # builds the API, downloads /openapi/v1.json, runs openapi-typescript
```

### Mobile and desktop

* Mobile: `cd apps/mobile && EXPO_PUBLIC_API_URL=http://<your-ip>:5080 npx expo start`. See [`apps/mobile/README.md`](apps/mobile/README.md).
* Desktop: `npm run build -w @techrat/desktop` builds the installers. See [`apps/desktop/README.md`](apps/desktop/README.md).

## Languages (i18n)

The web and desktop apps support English (`en`) and Brazilian Portuguese (`pt-BR`).

* **Choosing the language:** the first visit follows the browser language (any Portuguese variant → `pt-BR`, anything else → English). The EN/PT toggle in the header, on the sign-in pages and in Settings saves the choice in the `techrat-locale` cookie (read by the web server for SSR) and in `localStorage` (desktop).
* **UI strings:** `apps/web/src/i18n/messages/<locale>/<namespace>.ts`, one namespace per area. The pt-BR files are typed against the English ones, so a missing key fails `npm run typecheck`. Components use `const t = useT()` and `useFormat()` for numbers, dates and durations.
* **API:** every request sends `Accept-Language`. The API (request localization) answers in that language: catalog names, validation and error messages (`TechRat.Application/Common/Localization.cs`, plus a localized Identity error describer), recommendation reasons, achievement notifications and emails. Unsupported languages fall back to English.
* **Catalog translations:** stored in `content.content_translations` and seeded from `backend/TechRat.Infrastructure/Seed/Data/i18n/pt-BR.json` (keyed by topic/subtopic slug, roadmap slug + module/step order, and achievement code). Like the rest of the seed, only missing rows are inserted. The base (English) text lives on the entities; missing translations fall back to it. The admin area edits the English text only.
* **Design:** see [ADR-0011](docs/adr/0011-internationalization.md).
* **Adding a language:** add the code to `LOCALES` (web) and `AppLocales.Supported` (API), add a `messages/<locale>` folder, the server texts in `Localization.cs` and a `Seed/Data/i18n/<locale>.json`.

## Testing

| Suite | Command | What it covers |
|---|---|---|
| Backend unit + integration (xUnit, Testcontainers PostgreSQL) | `cd backend && dotnet test` | Level curve, XP, grading, XP once per question, topic progression, roadmap criteria/unlocking/prerequisites, achievements (outbox, idempotent), streaks, leaderboard ranking/periods, difficulty analytics, adaptive selection, daily challenge, auth boundaries (401/403/admin), cookies, refresh/logout, validation, seed integrity and idempotency, localization (catalog/messages/Identity errors/notifications in pt-BR, fallback to English, translation coverage, text parity) |
| Web component tests (Vitest + Testing Library) | `npm test -w @techrat/web` | Question flow (correct/incorrect feedback, locking, Learn more, next, summary, keyboard), auth form validation, accessibility primitives, i18n (locale detection, EN/PT switch and persistence, message parity, Accept-Language, formatting, translated validation) |
| Shared packages | `npm test -w @techrat/auth -w @techrat/validation` | Token refresh (single flight), validation rules |
| Mobile (jest-expo) | `npm test -w @techrat/mobile` | Answer flow with mocked API, helpers |
| Seed scripts (unittest) | `python3 -m unittest discover -s scripts/seed-src -p "test_*.py"` | README catalog generator, and that the README catalog matches the seed |
| E2E (Playwright) | `docker compose up -d` and then `npx playwright test` | Register → logout/login → Learn → Data Structures → practice → answer → XP → topic progress → profile XP; Portuguese browser → app in Portuguese → EN/PT switch persists; mobile bottom navigation |

To reuse a running PostgreSQL instead of Testcontainers, set `TECHRAT_TEST_POSTGRES="Host=…;Username=…;Password=…"`.

CI (`.github/workflows/ci.yml`) runs the backend build (warnings as errors) and tests, seed validation, the seed script tests and the README catalog check, lint, typecheck, unit tests, the web and desktop builds, Docker image builds, and the Compose + Playwright E2E. There is no automatic deployment.

## Security

* Identity password hashing, account lockout, security-stamp validation and persisted Data Protection keys.
* The web app uses an HttpOnly, SameSite=Strict cookie, so tokens are never readable by JavaScript.
* Endpoints are rate limited: auth per IP, answers per user.
* CORS uses an explicit origin list.
* Security headers are set on both the API and the web app. A strict CSP is set on the API and in Tauri.
* All queries go through EF Core and are parameterized.
* Inputs are validated server-side and errors are returned as RFC 9457 problem details.
* Logs never contain passwords, tokens or reset codes.
* Users only ever see their own sessions. Emails are not exposed on public profiles.

## Observability

* Every request produces one structured log line with TraceId, UserId, Endpoint, StatusCode and Duration. Outside development the logs are JSON.
* OpenTelemetry traces and metrics cover ASP.NET Core, HttpClient, Npgsql and the runtime. They are exported over OTLP, so an OTel collector can forward them to Azure Monitor or Application Insights.
* `/health/live` is a liveness check. `/health/ready` checks PostgreSQL and Redis; a Redis failure is reported as *Degraded*.

## Known limitations

* **Answer-length bias in the seed content:** the correct option is the strictly longest one in about 42% of questions. The original 1,008 questions are still around 63%; the 699 added later (`questions/*-2.json`) are at 12%. The original content needs an editorial pass to balance option lengths (see Next steps).
* **OAuth providers** are prepared but not wired. GitHub is featured in the UI as "coming soon".
* **Analytics** group the selected period (up to 365 days) in memory per user. This is fine at MVP scale; move to SQL or materialized aggregates when it grows.
* **Rate limiting** is in-process per instance. Move it to Redis or the gateway when scaling out.
* **Desktop tokens** are stored in the webview's app-private storage; moving them to the OS keychain is planned (ADR-0006). The desktop `.deb` was built in CI-like conditions but not exercised interactively.
* **Mobile** was verified by typecheck, unit tests and an Android bundle export. It has not been run on a device in this environment.
* **Question types:** only MultipleChoice is playable. The other types are modeled for future use.
* On the very first startup, EF logs one expected `fail:` line while it probes for the migrations history table.
* Social features (duels, friends, teams, community) and AI recommendations are P2 and not implemented. The Community page says so.
* **Portuguese coverage:** questions (text, options, explanations) are still English-only, the mobile app is not translated yet, and catalog translations can only be changed through the seed file (the admin area edits the English text).

## Next steps

1. Content pass: balance option lengths in the original questions, and add CodeOutput and Debugging question types.
2. Wire OAuth starting with GitHub, then Google, Microsoft and Apple.
3. Azure deployment: Container Apps for the API and web, PostgreSQL Flexible Server, Azure Cache for Redis, Key Vault with Managed Identity, and Application Insights via OTLP. Add a deploy workflow with environment approvals.
4. Move the outbox relay to Azure Service Bus when there are multiple consumers.
5. Spaced repetition for questions answered incorrectly, and smarter adaptive selection.
6. P2 social features: duels over SignalR, friends and teams.
