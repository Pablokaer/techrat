# ADR-0001: Modular monolith

**Status:** Accepted · 2026-10

## Context
TechRat is an MVP with one team, one database and tightly related features (questions → XP → levels → roadmaps → achievements → leaderboards). Most operations touch several of these in a single transaction (grading an answer updates attempts, XP ledger, user and topic progress, roadmap steps).

## Decision
One deployable ASP.NET Core 10 application, split into explicit modules:
- `TechRat.Domain` — entities and pure rules (level curve, streak rules), no framework dependencies.
- `TechRat.Application` — use cases per module folder (Practice, Roadmaps, Gamification, Catalog, Analytics, Leaderboards, Users, Notifications, Administration).
- `TechRat.Infrastructure` — EF Core/PostgreSQL, Redis cache, Identity stores, outbox dispatcher, email, seed.
- `TechRat.Modules` — the HTTP surface: one `IEndpointModule` per module, auto-discovered under `/api/v1`.
- `TechRat.Api` — composition root: auth, OpenAPI, telemetry, rate limiting, health checks, SignalR.

Database schemas mirror module boundaries (`identity`, `content`, `learning`, `roadmaps`, `gamification`, `notifications`, `infrastructure`).

## Consequences
- Single transaction for the answer flow; simple local dev (`docker compose up`).
- No microservices, Kafka, Kubernetes, CQRS or event sourcing (explicitly out of scope).
- Pragmatic trade-off: application services use EF Core LINQ through `IAppDbContext` instead of per-aggregate repositories. Modules can be extracted later along the schema boundaries; the outbox (ADR-0009) is the seam for asynchronous integration.
