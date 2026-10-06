# TechRat — Learn › Practice › Level Up

TechRat is a gamified platform for studying technology and preparing for tech jobs. Learners answer questions, follow roadmaps, earn XP, level up globally and per topic, keep streaks, unlock badges and climb leaderboards. The content runs from programming fundamentals to system design, AI engineering, cloud and DevOps.

This repository holds a working MVP: an ASP.NET Core 10 API, a responsive Next.js web app, an Expo mobile app and a Tauri desktop app. All the clients share one API and one set of generated contracts.

| | |
|---|---|
| Knowledge tree | Topics and subtopics from programming fundamentals to AI, cloud and leadership (see [Catalog](#catalog)) |
| Question bank | Multiple-choice questions in four difficulties (counts in [Catalog](#catalog)). Every subtopic used by a roadmap has at least 6 questions. Every question has 4 options, exactly 1 correct answer, an explanation and an official reference URL. |
| Roadmaps | Career, language, skill and best-practice paths composed from a shared module catalog: a step proven once counts in every roadmap (full list in [Catalog](#catalog)). |
| Gamification | XP ledger, progressive levels (global + per topic), streaks, 24 achievements/badges, daily challenge, Global/Weekly/Monthly/Topic leaderboards |
| Languages | English and Brazilian Portuguese (web + desktop): the whole UI, every question (text, options, explanation), topic, module, roadmap and achievement names, server messages and emails. |

<!-- catalog:start -->
## Catalog

_Generated from the seed data by `python3 scripts/seed-src/readme_catalog.py`. Do not edit by hand; CI fails when it is out of date._

### Questions

**2,263** multiple-choice questions: Easy 613 · Medium 778 · Hard 614 · Expert 258.

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
| Performance Engineering | Engineering | 11 | 60 |
| Engineering Leadership | Career | 6 | 36 |
| Statistics | AI & Data | 9 | 45 |
| Data Analysis with Python | AI & Data | 8 | 48 |
| Data Visualization & BI | AI & Data | 6 | 30 |
| Spreadsheets | AI & Data | 6 | 30 |
| AI-Assisted Development | AI & Data | 10 | 50 |
| C++ | Languages | 12 | 60 |
| AWS | Cloud & DevOps | 10 | 62 |
| Offensive & Defensive Security | Security | 10 | 50 |
| API Security | Security | 7 | 35 |
| Code Review | Engineering | 6 | 36 |
| Capstones | Career | 5 | 75 |

</details>

### Roadmaps

**43** roadmaps built from **140** modules (69 shared by 2+ roadmaps) · 373 module steps.

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
| 11 | C++ Developer | Desenvolvedor C++ | Language | Languages | Intermediate | 6 (1 optional) | 13 | 10 h | 87 | — |
| 12 | Frontend Developer | Desenvolvedor Frontend | Role | Web Development | Intermediate | 9 | 19 | 12 h | 114 | — |
| 13 | React Developer | Desenvolvedor React | SkillTrack | Web Development | Intermediate | 5 | 12 | 9 h | 72 | JavaScript Developer (50%) |
| 14 | Backend Developer | Desenvolvedor Backend | Role | Web Development | Intermediate | 16 (4 optional) | 25 | 17 h | 245 | — |
| 15 | .NET Backend Developer | Desenvolvedor Backend .NET | Role | Web Development | Intermediate | 7 | 15 | 12 h | 90 | C# Developer (50%) |
| 16 | Full Stack Developer | Desenvolvedor Full Stack | Role | Web Development | Intermediate | 12 (3 optional) | 19 | 12 h | 194 | JavaScript Developer (30%) |
| 17 | Database Engineering | Engenharia de Bancos de Dados | SkillTrack | Data | Intermediate | 5 | 11 | 9 h | 66 | — |
| 18 | SQL | SQL | SkillTrack | Data | Beginner | 4 | 8 | 6 h | 48 | — |
| 19 | System Design | System Design | SkillTrack | Architecture | Advanced | 11 | 28 | 26 h | 174 | Data Structures and Algorithms (30%), Backend Developer (30%) |
| 20 | Software Architecture | Arquitetura de Software | SkillTrack | Architecture | Advanced | 5 | 16 | 15 h | 96 | — |
| 21 | Testing and Quality Engineering | Engenharia de Testes e Qualidade | SkillTrack | Engineering | Intermediate | 4 | 8 | 6 h | 48 | — |
| 22 | Security Fundamentals | Fundamentos de Segurança | SkillTrack | Security | Intermediate | 5 | 11 | 9 h | 66 | — |
| 23 | Cyber Security | Cibersegurança | Role | Security | Intermediate | 11 (1 optional) | 27 | 23 h | 166 | — |
| 24 | Docker | Docker | SkillTrack | Cloud & DevOps | Beginner | 3 | 7 | 5 h | 42 | — |
| 25 | Kubernetes | Kubernetes | SkillTrack | Cloud & DevOps | Advanced | 3 | 8 | 8 h | 48 | Docker (50%) |
| 26 | DevOps Engineer | Engenheiro DevOps | Role | Cloud & DevOps | Intermediate | 11 (3 optional) | 16 | 11 h | 171 | — |
| 27 | Cloud Engineering | Engenharia de Cloud | Role | Cloud & DevOps | Intermediate | 6 (2 optional) | 10 | 7 h | 110 | — |
| 28 | Azure Developer | Desenvolvedor Azure | SkillTrack | Cloud & DevOps | Intermediate | 2 | 6 | 4 h | 36 | Cloud Engineering (30%) |
| 29 | AWS Fundamentals | Fundamentos de AWS | SkillTrack | Cloud & DevOps | Beginner | 4 (1 optional) | 7 | 4 h | 72 | — |
| 30 | AI Engineering | Engenharia de IA | Role | AI & Data | Advanced | 6 (1 optional) | 13 | 12 h | 103 | Python Developer (30%) |
| 31 | Machine Learning | Machine Learning | SkillTrack | AI & Data | Advanced | 3 | 9 | 8 h | 54 | — |
| 32 | Data Engineering | Engenharia de Dados | Role | AI & Data | Intermediate | 7 (3 optional) | 9 | 7 h | 119 | — |
| 33 | Data Analyst | Analista de Dados | Role | AI & Data | Beginner | 11 | 37 | 24 h | 210 | — |
| 34 | Python for Data Analysis | Python para Análise de Dados | SkillTrack | AI & Data | Beginner | 4 | 17 | 10 h | 96 | — |
| 35 | AI & Data Scientist | Cientista de Dados e IA | Role | AI & Data | Advanced | 13 (4 optional) | 29 | 23 h | 226 | Python for Data Analysis (30%) |
| 36 | AI-Assisted Development (Claude Code) | Desenvolvimento Assistido por IA (Claude Code) | SkillTrack | AI & Data | Intermediate | 4 | 17 | 16 h | 101 | — |
| 37 | Junior Software Engineer | Engenheiro de Software Júnior | Role | Career | Beginner | 15 | 32 | 17 h | 192 | — |
| 38 | Senior Software Engineer | Engenheiro de Software Sênior | Role | Career | Expert | 18 (1 optional) | 47 | 46 h | 311 | System Design (30%) |
| 39 | Technical Interview Preparation | Preparação para Entrevistas Técnicas | SkillTrack | Career | Advanced | 9 | 21 | 16 h | 132 | — |
| 40 | API Security Best Practices | Boas Práticas de Segurança de APIs | BestPractices | Security | Advanced | 3 (1 optional) | 7 | 7 h | 47 | — |
| 41 | Backend Performance Best Practices | Boas Práticas de Performance no Backend | BestPractices | Engineering | Advanced | 4 (1 optional) | 9 | 8 h | 71 | — |
| 42 | Code Review Best Practices | Boas Práticas de Code Review | BestPractices | Engineering | Intermediate | 2 (1 optional) | 6 | 6 h | 48 | — |
| 43 | AWS Best Practices | Boas Práticas na AWS | BestPractices | Cloud & DevOps | Advanced | 4 (1 optional) | 12 | 10 h | 94 | — |

<details><summary>Module catalog</summary>

| Module | Kind | Steps | Used by |
|---|---|---:|---|
| Programming Basics | Core | 3 | Computer Science Fundamentals, Junior Software Engineer |
| Problem Solving & Complexity | Core | 2 | Computer Science Fundamentals, Junior Software Engineer |
| Recursion & Discrete Math | Context | 2 | Computer Science Fundamentals |
| How Computers Work | Context | 4 | Computer Science Fundamentals |
| Processes & Memory | Core | 2 | Computer Science Fundamentals, Operating Systems, C++ Developer |
| Scheduling, System Calls & Synchronization | Context | 3 | Operating Systems |
| Linux & Shell | Core | 2 | Operating Systems, Cyber Security, DevOps Engineer |
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
| Network Models & Transport | Core | 3 | Computer Networking, Cyber Security |
| DNS & HTTP | Core | 2 | Computer Networking, Backend Developer, System Design, Junior Software Engineer |
| TLS, NAT & Firewalls | Core | 2 | Computer Networking, Cyber Security |
| Proxies, CDNs & WebSockets | Context | 2 | Computer Networking |
| HTTP & APIs | Core | 2 | Backend Developer, Full Stack Developer, Junior Software Engineer |
| Webhooks, Real-Time & gRPC | Context | 3 | Backend Developer |
| Caching & Queues | Core | 2 | Backend Developer, Backend Performance Best Practices |
| Security Foundations | Core | 2 | Backend Developer, Security Fundamentals, Cyber Security, Junior Software Engineer |
| Authentication Fundamentals | Core | 2 | Backend Developer, Full Stack Developer, Security Fundamentals, API Security Best Practices |
| Passwords, OAuth & OIDC | Context | 2 | Security Fundamentals |
| API & Infrastructure Security | Context | 3 | Security Fundamentals |
| Threat Modeling & Secure Coding | Core | 2 | Security Fundamentals, Cyber Security, Senior Software Engineer |
| SQL Foundations | Core | 2 | Backend Developer, Full Stack Developer, Database Engineering, SQL, System Design, Data Analyst, AI & Data Scientist, Junior Software Engineer |
| SQL for Analytics | Core | 2 | Database Engineering, SQL, Data Engineering, Data Analyst, AI & Data Scientist |
| SQL for Applications | Core | 2 | Backend Developer, .NET Backend Developer, Database Engineering, SQL, Senior Software Engineer |
| SQL Performance | Core | 2 | Backend Developer, Full Stack Developer, Database Engineering, SQL, Senior Software Engineer, Backend Performance Best Practices |
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
| Python Core | Core | 5 | Python Developer, Data Analyst, Python for Data Analysis |
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
| Performance Testing & Profiling | Core | 2 | Testing and Quality Engineering, Senior Software Engineer, Backend Performance Best Practices |
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
| AWS Foundations | Core | 2 | Cloud Engineering, AWS Fundamentals, AWS Best Practices |
| Cloud Operations | Context | 3 | Cloud Engineering |
| Azure Compute, Data & Identity | Context | 3 | Azure Developer |
| Azure Messaging, Networking & Monitoring | Context | 3 | Azure Developer |
| ML Foundations | Core | 3 | AI Engineering, Machine Learning, AI & Data Scientist |
| Supervised Models | Core | 3 | Machine Learning, AI & Data Scientist |
| Features, Clustering & Neural Networks | Core | 3 | Machine Learning, AI & Data Scientist |
| LLM Application Basics | Core | 3 | AI Engineering, AI & Data Scientist |
| RAG & Retrieval | Core | 2 | AI Engineering, AI & Data Scientist |
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
| Code Review & Mentoring | Core | 2 | Git and Collaboration, Senior Software Engineer, Code Review Best Practices |
| Incidents & Reliability | Core | 2 | Junior Software Engineer, Senior Software Engineer |
| Statistics Foundations | Core | 4 | Data Analyst, Python for Data Analysis, AI & Data Scientist |
| Statistical Inference & Experiments | Core | 5 | Data Analyst, AI & Data Scientist |
| Spreadsheets for Analysis | Context | 6 | Data Analyst |
| Data Analysis with NumPy & pandas | Core | 5 | Data Engineering, Data Analyst, Python for Data Analysis, AI & Data Scientist |
| Time Series & Reproducible Notebooks | Context | 2 | AI & Data Scientist |
| Data Visualization | Core | 3 | Data Analyst, Python for Data Analysis, AI & Data Scientist |
| BI Modeling & Tools | Core | 2 | Data Engineering, Data Analyst |
| Business Questions & Storytelling | Context | 2 | Data Analyst |
| AI-Assisted Development | Core | 5 | Backend Developer, Full Stack Developer, DevOps Engineer, AI Engineering, Data Engineering, AI-Assisted Development (Claude Code), Senior Software Engineer |
| Claude Code Workflows | Context | 5 | AI-Assisted Development (Claude Code) |
| AWS Core Services in Depth | Core | 6 | DevOps Engineer, Cloud Engineering, AWS Fundamentals, AWS Best Practices |
| C++ Foundations | Context | 3 | C++ Developer |
| Memory, RAII & Move Semantics | Context | 3 | C++ Developer |
| Templates, STL & Modern C++ | Context | 4 | C++ Developer |
| Concurrency & Undefined Behavior | Context | 2 | C++ Developer |
| Security Operations & Incident Response | Context | 3 | Cyber Security |
| Threats, Vulnerabilities & Pentesting | Context | 3 | Cyber Security |
| Cryptography, Zero Trust & Cloud Security | Core | 4 | Cyber Security, DevOps Engineer, Cloud Engineering, AWS Best Practices |
| API Security Best Practices | BestPractices | 4 | Backend Developer, Full Stack Developer, Cyber Security, Senior Software Engineer, API Security Best Practices |
| API Hardening & Monitoring | BestPractices | 3 | Backend Developer, Cyber Security, Senior Software Engineer, API Security Best Practices |
| Backend Performance Best Practices | BestPractices | 5 | Backend Developer, Full Stack Developer, Senior Software Engineer, Backend Performance Best Practices |
| Code Review Best Practices | BestPractices | 6 | AI-Assisted Development (Claude Code), Senior Software Engineer, Code Review Best Practices |
| AWS Best Practices | BestPractices | 4 | AWS Best Practices |
| Data Analyst Capstone | Capstone | 1 | Data Analyst |
| AI & Data Scientist Capstone | Capstone | 1 | AI & Data Scientist |
| AI-Assisted Development Capstone | Capstone | 1 | AI-Assisted Development (Claude Code) |
| Cyber Security Capstone | Capstone | 1 | Cyber Security |
| C++ Capstone | Capstone | 1 | C++ Developer |

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
* **Roadmaps and modules (ADR-0012):** roadmaps are ordered compositions of reusable catalog modules. Progress is stored per module step, so knowledge proven in one roadmap counts in every roadmap containing the same module, and XP is paid once.

```
Topic ─┬─ Subtopic (scope) ◄── ModuleStep ──┐            each scope belongs to exactly one module
       └─ Question (EN + pt-BR)              │
                                   LearningModule (Core · Context · BestPractices · Capstone)
                                             ▲
Roadmap ── RoadmapModuleLink (order, required/optional) ──┘     RoadmapDependency (prerequisite %)

Learner: UserModuleStepCompletion (global, permanent) → UserModuleProgress → UserRoadmapProgress
```

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
| `Smtp__Host`, `Smtp__Port`, `Smtp__Security`, `Smtp__Username`, `Smtp__Password`, `Smtp__From`, `Smtp__ReplyTo` | API | Email delivery (Compose: `SMTP_*`; Mailpit locally). TLS is required unless `Security=None`. Setup per provider, DNS and testing: [docs/email.md](docs/email.md) |
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

The seed sources live in `scripts/seed-src`: `topics.py` (knowledge tree), `modules.py` (module catalog) and `roadmaps.py` (roadmap compositions) generate the JSON files. `QUESTION_AUTHORING.md` has the question rules and `CATALOG_AUTHORING.md` explains how to design modules and roadmaps.

```bash
python3 scripts/seed-src/topics.py
python3 scripts/seed-src/modules.py
python3 scripts/seed-src/roadmaps.py
python3 scripts/seed-src/validate_questions.py   # schema, 4 options, 1 correct, unique ids/text, https refs, pt-BR translations, answer-length bias (≤ 35% per file)
python3 scripts/seed-src/validate_catalog.py     # modules exist, one module per scope, ≥ 5 questions per step, Core reuse, Context/Capstone rules, no cycles + reuse report
python3 scripts/seed-src/readme_catalog.py       # regenerates the README "Catalog" section
```

**Adding a module or roadmap:** add the subtopics (and at least 5 bilingual questions each) first, then the module in `modules.py` (kind, steps over the new scopes), then compose it into roadmaps in `roadmaps.py`, add the Portuguese names to `Seed/Data/i18n/pt-BR.json`, regenerate and run the validators.

The seed inserts missing records (matched by slug, external key, code or scope) and never duplicates data. Content it owns (seeded questions never edited by an admin, seed-managed modules and roadmap compositions, seed-managed translations) follows the seed files; anything edited in the admin area is kept.

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
* **Content translations:** stored in `content.content_translations`. Catalog texts are seeded from `backend/TechRat.Infrastructure/Seed/Data/i18n/pt-BR.json` (topics/subtopics by slug, modules with step titles keyed by `topic/subtopic`, roadmaps by slug, achievements by code); questions from `Seed/Data/i18n/questions/<group>.pt-BR.json` (by question id) and served per practice session. Seed-managed rows follow the files; rows customised by an admin are kept. The base (English) text lives on the entities; missing translations fall back to it.
* **Design:** see [ADR-0011](docs/adr/0011-internationalization.md).
* **Adding a language:** add the code to `LOCALES` (web) and `AppLocales.Supported` (API), add a `messages/<locale>` folder, the server texts in `Localization.cs` and a `Seed/Data/i18n/<locale>.json`.

## Testing

| Suite | Command | What it covers |
|---|---|---|
| Backend unit + integration (xUnit, Testcontainers PostgreSQL) | `cd backend && dotnet test` | Level curve, XP, grading, XP once per question, topic progression, roadmap criteria/unlocking/prerequisites, achievements (outbox, idempotent), streaks, leaderboard ranking/periods, difficulty analytics, adaptive selection, daily challenge, auth boundaries (401/403/admin), cookies, refresh/logout, validation, seed integrity and idempotency, module catalog (composition rules, shared credit across roadmaps, XP once, optional modules, versioning, data migration, module/admin composition API), localization (catalog/messages/Identity errors/notifications in pt-BR, fallback to English, translation coverage, text parity) |
| Web component tests (Vitest + Testing Library) | `npm test -w @techrat/web` | Question flow (correct/incorrect feedback, locking, Learn more, next, summary, keyboard), auth form validation, accessibility primitives, i18n (locale detection, EN/PT switch and persistence, message parity, Accept-Language, formatting, translated validation), shared modules on roadmaps (Shared/Also in, completed elsewhere, optional/capstone, "already have N of M"), module page, admin module catalog and roadmap composition |
| Shared packages | `npm test -w @techrat/auth -w @techrat/validation` | Token refresh (single flight), validation rules |
| Mobile (jest-expo) | `npm test -w @techrat/mobile` | Answer flow with mocked API, helpers, roadmap module states (shared, completed elsewhere, optional, capstone, new steps) |
| Seed scripts (unittest) | `python3 -m unittest discover -s scripts/seed-src -p "test_*.py"` | Question validator (translations, answer-length bias), catalog validator (scope ownership, reuse, cycles, capstones), README catalog generator, and that the README catalog matches the seed |
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

* **Shared modules change a few roadmap sizes:** re-composing the existing roadmaps from shared modules added steps to some of them (394 → 449 steps), so learners' percentages there can be slightly lower than before; completions are never lost (ADR-0012).
* **OAuth providers** are prepared but not wired. GitHub is featured in the UI as "coming soon".
* **Analytics** group the selected period (up to 365 days) in memory per user. This is fine at MVP scale; move to SQL or materialized aggregates when it grows.
* **Rate limiting** is in-process per instance. Move it to Redis or the gateway when scaling out.
* **Desktop tokens** are stored in the webview's app-private storage; moving them to the OS keychain is planned (ADR-0006). The desktop `.deb` was built in CI-like conditions but not exercised interactively.
* **Mobile** was verified by typecheck, unit tests and an Android bundle export. It has not been run on a device in this environment.
* **Question types:** only MultipleChoice is playable. The other types are modeled for future use.
* On the very first startup, EF logs one expected `fail:` line while it probes for the migrations history table.
* Social features (duels, friends, teams, community) and AI recommendations are P2 and not implemented. The Community page says so.
* **Portuguese coverage:** the mobile app is not translated yet, and translations of questions and catalog texts can only be changed through the seed files (the admin area edits the English text).

## Next steps

1. Content: add CodeOutput and Debugging question types; let admins edit Portuguese translations.
2. Wire OAuth starting with GitHub, then Google, Microsoft and Apple.
3. Azure deployment: Container Apps for the API and web, PostgreSQL Flexible Server, Azure Cache for Redis, Key Vault with Managed Identity, and Application Insights via OTLP. Add a deploy workflow with environment approvals.
4. Move the outbox relay to Azure Service Bus when there are multiple consumers.
5. Spaced repetition for questions answered incorrectly, and smarter adaptive selection.
6. P2 social features: duels over SignalR, friends and teams.
