# ADR-0003: Redis as a cache, never as a source of truth

**Status:** Accepted

Redis (via `IDistributedCache`) caches the topic catalog, the roadmap catalog and computed leaderboard pages (30 s TTL). The caller's own rank is always computed live from PostgreSQL.

If Redis is absent or unreachable the app falls back (in-memory distributed cache when not configured; cache errors are logged and the database is queried). `/health/ready` reports Redis as *Degraded*, not *Unhealthy*.

Rate limiting currently uses ASP.NET Core's in-process limiter. When running multiple instances, move limits to Redis or the API gateway (Azure Front Door / APIM).
