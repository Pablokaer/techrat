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

**32** roadmaps built from **112** modules (49 shared by 2+ roadmaps) · 279 module steps.

| # | Roadmap | Português | Type | Category | Difficulty | Modules | Steps | Estimate | Questions | Prerequisites |
|---:|---|---|---|---|---|---:|---:|---:|---:|---|
| 1 | Computer Science Fundamentals | Fundamentos de Ciência da Computação | SkillTrack | Computer Science | Beginner | 6 | 16 | 9 h | 96 | — |
| 2 | Data Structures and Algorithms | Estruturas de Dados e Algoritmos | SkillTrack | Computer Science | Intermediate | 12 | 29 | 22 h | 174 | Computer Science Fundamentals (50%) |
| 3 | Operating Systems | Sistemas Operacionais | SkillTrack | Computer Science | Intermediate | 4 | 9 | 8 h | 54 | — |
| 4 | Computer Networking | Redes de Computadores | SkillTrack | Computer Science | Intermediate | 4 | 9 | 6 h | 54 | — |
| 5 | Git and Collaboration | Git e Colaboração | SkillTrack | Tools | Beginner | 4 | 9 | 6 h | 54 | — |
| 6 | C# Developer | Desenvolvedor C# | Language | Languages | Intermediate | 5 | 12 | 10 h | 72 | — |
| 7 | Python Developer | Desenvolvedor Python | Language | Languages | Beginner | 3 | 10 | 7 h | 60 | — |
| 8 | Java Developer | Desenvolvedor Java | Language | Languages | Intermediate | 2 | 8 | 7 h | 48 | — |
| 9 | JavaScript Developer | Desenvolvedor JavaScript | Language | Languages | Beginner | 3 | 9 | 6 h | 54 | — |
| 10 | TypeScript Developer | Desenvolvedor TypeScript | Language | Languages | Intermediate | 3 | 7 | 5 h | 42 | JavaScript Developer (50%) |
| 11 | Frontend Developer | Desenvolvedor Frontend | Role | Web Development | Intermediate | 9 | 19 | 12 h | 114 | — |
| 12 | React Developer | Desenvolvedor React | SkillTrack | Web Development | Intermediate | 5 | 12 | 9 h | 72 | JavaScript Developer (50%) |
| 13 | Backend Developer | Desenvolvedor Backend | Role | Web Development | Intermediate | 12 | 25 | 17 h | 150 | — |
| 14 | .NET Backend Developer | Desenvolvedor Backend .NET | Role | Web Development | Intermediate | 7 | 15 | 12 h | 90 | C# Developer (50%) |
| 15 | Full Stack Developer | Desenvolvedor Full Stack | Role | Web Development | Intermediate | 9 | 19 | 12 h | 114 | JavaScript Developer (30%) |
| 16 | Database Engineering | Engenharia de Bancos de Dados | SkillTrack | Data | Intermediate | 5 | 11 | 9 h | 66 | — |
| 17 | System Design | System Design | SkillTrack | Architecture | Advanced | 11 | 28 | 26 h | 174 | Data Structures and Algorithms (30%), Backend Developer (30%) |
| 18 | Software Architecture | Arquitetura de Software | SkillTrack | Architecture | Advanced | 5 | 16 | 15 h | 96 | — |
| 19 | Testing and Quality Engineering | Engenharia de Testes e Qualidade | SkillTrack | Engineering | Intermediate | 4 | 8 | 6 h | 48 | — |
| 20 | Security Fundamentals | Fundamentos de Segurança | SkillTrack | Security | Intermediate | 5 | 11 | 9 h | 66 | — |
| 21 | Docker | Docker | SkillTrack | Cloud & DevOps | Beginner | 3 | 7 | 5 h | 42 | — |
| 22 | Kubernetes | Kubernetes | SkillTrack | Cloud & DevOps | Advanced | 3 | 8 | 8 h | 48 | Docker (50%) |
| 23 | DevOps Engineer | Engenheiro DevOps | Role | Cloud & DevOps | Intermediate | 8 | 16 | 11 h | 96 | — |
| 24 | Cloud Engineering | Engenharia de Cloud | Role | Cloud & DevOps | Intermediate | 4 | 10 | 7 h | 60 | — |
| 25 | Azure Developer | Desenvolvedor Azure | SkillTrack | Cloud & DevOps | Intermediate | 2 | 6 | 4 h | 36 | Cloud Engineering (30%) |
| 26 | AWS Fundamentals | Fundamentos de AWS | SkillTrack | Cloud & DevOps | Beginner | 3 | 7 | 4 h | 42 | — |
| 27 | AI Engineering | Engenharia de IA | Role | AI & Data | Advanced | 5 | 13 | 12 h | 78 | Python Developer (30%) |
| 28 | Machine Learning | Machine Learning | SkillTrack | AI & Data | Advanced | 3 | 9 | 8 h | 54 | — |
| 29 | Data Engineering | Engenharia de Dados | Role | AI & Data | Intermediate | 4 | 9 | 7 h | 54 | — |
| 30 | Junior Software Engineer | Engenheiro de Software Júnior | Role | Career | Beginner | 15 | 32 | 17 h | 192 | — |
| 31 | Senior Software Engineer | Engenheiro de Software Sênior | Role | Career | Expert | 13 | 29 | 28 h | 180 | System Design (30%) |
| 32 | Technical Interview Preparation | Preparação para Entrevistas Técnicas | SkillTrack | Career | Advanced | 9 | 21 | 16 h | 132 | — |

<details><summary>Module catalog</summary>

| Module | Kind | Steps | Used by |
|---|---|---:|---|
| Programming Basics | Core | 3 | Computer Science Fundamentals, Junior Software Engineer |
| Problem Solving & Complexity | Core | 2 | Computer Science Fundamentals, Junior Software Engineer |
| Recursion & Discrete Math | Context | 2 | Computer Science Fundamentals |
| How Computers Work | Context | 4 | Computer Science Fundamentals |
| Processes & Memory | Core | 2 | Computer Science Fundamentals, Operating Systems |
| Scheduling, System Calls & Synchronization | Context | 3 | Operating Systems |
| Linux & Shell | Core | 2 | Operating Systems, DevOps Engineer |
| Arrays, Strings & Hashing | Core | 3 | Computer Science Fundamentals, Data Structures and Algorithms, Junior Software Engineer, Technical Interview Preparation |
| Linked Lists, Stacks & Queues | Context | 3 | Data Structures and Algorithms |
| Trees & Heaps | Core | 2 | Data Structures and Algorithms, Technical Interview Preparation |
| Search Trees, Tries & String Algorithms | Context | 3 | Data Structures and Algorithms |
| Graphs & Traversal | Core | 2 | Data Structures and Algorithms, Technical Interview Preparation |
| Searching & Sorting | Core | 2 | Data Structures and Algorithms, Junior Software Engineer, Technical Interview Preparation |
| Two Pointers & Sliding Window | Core | 2 | Data Structures and Algorithms, Junior Software Engineer, Technical Interview Preparation |
| Matrices & Prefix Sums | Context | 2 | Data Structures and Algorithms |
| Tree Traversal & Divide and Conquer | Context | 2 | Data Structures and Algorithms |
| Greedy & Intervals | Core | 2 | Data Structures and Algorithms, Technical Interview Preparation |
| Backtracking & Dynamic Programming | Core | 2 | Data Structures and Algorithms, Technical Interview Preparation |
| Advanced Graph Algorithms | Context | 4 | Data Structures and Algorithms |
| Network Models & Transport | Context | 3 | Computer Networking |
| DNS & HTTP | Core | 2 | Computer Networking, Backend Developer, System Design, Junior Software Engineer |
| TLS, NAT & Firewalls | Context | 2 | Computer Networking |
| Proxies, CDNs & WebSockets | Context | 2 | Computer Networking |
| HTTP & APIs | Core | 2 | Backend Developer, Full Stack Developer, Junior Software Engineer |
| Webhooks, Real-Time & gRPC | Context | 3 | Backend Developer |
| Caching & Queues | Context | 2 | Backend Developer |
| Security Foundations | Core | 2 | Backend Developer, Security Fundamentals, Junior Software Engineer |
| Authentication Fundamentals | Core | 2 | Backend Developer, Full Stack Developer, Security Fundamentals |
| Passwords, OAuth & OIDC | Context | 2 | Security Fundamentals |
| API & Infrastructure Security | Context | 3 | Security Fundamentals |
| Threat Modeling & Secure Coding | Core | 2 | Security Fundamentals, Senior Software Engineer |
| SQL Foundations | Core | 2 | Backend Developer, Full Stack Developer, Database Engineering, System Design, Junior Software Engineer |
| SQL for Analytics | Core | 2 | Database Engineering, Data Engineering |
| SQL for Applications | Core | 2 | Backend Developer, .NET Backend Developer, Database Engineering, Senior Software Engineer |
| SQL Performance | Core | 2 | Backend Developer, Full Stack Developer, Database Engineering, Senior Software Engineer |
| Data Modeling & Scaling | Core | 3 | Database Engineering, System Design |
| System Design Foundations | Core | 3 | System Design, Technical Interview Preparation |
| Scaling Systems | Context | 3 | System Design |
| Messaging & Events | Context | 3 | System Design |
| Rate Limiting & API Gateways | Context | 2 | System Design |
| Distributed Systems | Core | 3 | System Design, Senior Software Engineer |
| High Availability & Disaster Recovery | Core | 2 | System Design, Cloud Engineering, AWS Fundamentals, Senior Software Engineer |
| Safe Releases & SLOs | Core | 2 | System Design, DevOps Engineer, Senior Software Engineer |
| Design Trade-offs & Interviews | Core | 3 | System Design, Senior Software Engineer, Technical Interview Preparation |
| C# Fundamentals | Core | 2 | C# Developer, Junior Software Engineer |
| Generics, Collections & LINQ | Context | 3 | C# Developer |
| C# Language Features | Context | 3 | C# Developer |
| Async & Concurrency in C# | Core | 2 | Operating Systems, C# Developer, .NET Backend Developer |
| Memory & Performance in C# | Context | 2 | C# Developer |
| Python Core | Context | 5 | Python Developer |
| Python Tooling & Testing | Context | 3 | Python Developer |
| Python Concurrency & Performance | Context | 2 | Python Developer |
| Java Core | Context | 4 | Java Developer |
| JVM, Concurrency & Spring | Context | 4 | Java Developer |
| JavaScript Core | Context | 4 | JavaScript Developer |
| Async JavaScript & the DOM | Core | 2 | JavaScript Developer, Frontend Developer |
| Modules, Errors & Performance | Context | 3 | JavaScript Developer |
| TypeScript Basics | Core | 2 | TypeScript Developer, Frontend Developer |
| Unions, Generics & Modules | Context | 3 | TypeScript Developer |
| Advanced TypeScript Types | Context | 2 | TypeScript Developer |
| HTML & CSS | Core | 2 | Frontend Developer, Full Stack Developer |
| Accessibility & Responsive Design | Context | 2 | Frontend Developer |
| Browser Rendering & Web Performance | Context | 2 | Frontend Developer |
| Frontend Architecture & Security | Context | 2 | Frontend Developer |
| React Foundations | Core | 3 | Frontend Developer, React Developer, Full Stack Developer |
| Refs, Context & Custom Hooks | Context | 2 | React Developer |
| Rendering & Memoization | Context | 2 | React Developer |
| Data Fetching & Forms | Core | 2 | Frontend Developer, React Developer |
| React in Production | Context | 3 | React Developer |
| The .NET Platform | Context | 3 | .NET Backend Developer |
| ASP.NET Core | Context | 2 | .NET Backend Developer |
| EF Core | Context | 2 | .NET Backend Developer |
| Hosting & Testing .NET | Context | 2 | .NET Backend Developer |
| Testing Essentials | Core | 2 | Frontend Developer, Backend Developer, Full Stack Developer, Testing and Quality Engineering, Junior Software Engineer |
| Test Doubles & Test Design | Context | 2 | Testing and Quality Engineering |
| Testing Strategy | Core | 2 | Testing and Quality Engineering, Senior Software Engineer |
| Performance Testing & Profiling | Core | 2 | Testing and Quality Engineering, Senior Software Engineer |
| CI/CD | Core | 2 | Full Stack Developer, DevOps Engineer, Junior Software Engineer |
| Infrastructure as Code | Context | 2 | DevOps Engineer |
| Observability Essentials | Core | 2 | Backend Developer, .NET Backend Developer, Senior Software Engineer |
| Metrics & Alerting | Context | 2 | DevOps Engineer |
| Docker Essentials | Core | 2 | Docker, Junior Software Engineer |
| Dockerfile & Compose | Core | 2 | Backend Developer, Full Stack Developer, Docker, DevOps Engineer |
| Docker in Production | Context | 3 | Docker |
| Kubernetes Essentials | Core | 2 | Kubernetes, DevOps Engineer |
| Kubernetes Networking, Config & Storage | Context | 3 | Kubernetes |
| Kubernetes in Production | Context | 3 | Kubernetes |
| Cloud Foundations | Core | 3 | Cloud Engineering, AWS Fundamentals |
| AWS Foundations | Core | 2 | Cloud Engineering, AWS Fundamentals |
| Cloud Operations | Context | 3 | Cloud Engineering |
| Azure Compute, Data & Identity | Context | 3 | Azure Developer |
| Azure Messaging, Networking & Monitoring | Context | 3 | Azure Developer |
| ML Foundations | Core | 3 | AI Engineering, Machine Learning |
| Supervised Models | Context | 3 | Machine Learning |
| Features, Clustering & Neural Networks | Context | 3 | Machine Learning |
| LLM Application Basics | Context | 3 | AI Engineering |
| RAG & Retrieval | Context | 2 | AI Engineering |
| Tool Calling & Agents | Context | 2 | AI Engineering |
| Production AI | Context | 3 | AI Engineering |
| Data Pipelines | Context | 3 | Data Engineering |
| Data Storage & Formats | Context | 2 | Data Engineering |
| Kafka & Data Quality | Context | 2 | Data Engineering |
| Design Principles | Context | 3 | Software Architecture |
| Design Patterns | Context | 4 | Software Architecture |
| Layered & Clean Architecture | Context | 2 | Software Architecture |
| Monoliths, Microservices & DDD | Core | 3 | Software Architecture, Senior Software Engineer |
| Event-Driven, CQRS & Serverless | Context | 4 | Software Architecture |
| Git Essentials | Core | 2 | Git and Collaboration, Junior Software Engineer |
| Git Collaboration | Core | 2 | Git and Collaboration, DevOps Engineer |
| Rewriting & Recovering History | Context | 3 | Git and Collaboration |
| Code Review & Mentoring | Core | 2 | Git and Collaboration, Senior Software Engineer |
| Incidents & Reliability | Core | 2 | Junior Software Engineer, Senior Software Engineer |

</details>
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
