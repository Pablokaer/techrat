# ADR-0002: PostgreSQL as the source of truth

**Status:** Accepted

PostgreSQL 17 stores everything durable: identity, content, attempts, the XP ledger, progress, roadmaps, achievements, notifications, outbox and Data Protection keys.

Why: strong transactions (the answer flow is multi-table), rich indexing, `FOR UPDATE SKIP LOCKED` for the outbox, `xmin` optimistic concurrency, excellent EF Core support (Npgsql), and first-class managed offerings on Azure (Azure Database for PostgreSQL Flexible Server).

Conventions: snake_case names (EFCore.NamingConventions), enums stored as strings, migrations in `TechRat.Infrastructure/Persistence/Migrations`, indexes for every hot query (question topic/subtopic/difficulty, attempts by user/question/date, XP by user/date, topic progress, roadmap steps by order).
