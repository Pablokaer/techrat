# ADR-0034: Two-level cache with HybridCache

**Status:** Accepted · Enforcement amended by ADR-0041 (entries declared once; the never-mix rule is enforced by types) · Builds on ADR-0002 (PostgreSQL as the source of truth, Redis as a cache only) and ADR-0030 (refresh-session state in the cache)

## Context

Every cached read went to Redis: the roadmap catalog, the topics, the pt-BR catalog translations and the leaderboard
pages were fetched and deserialized from Redis on every request. And when an entry expired, every request that arrived
before it was rebuilt ran the same query: 20 simultaneous misses ran the factory 20 times (a cache stampede). That is
cheap for the catalog but not for the leaderboards, which aggregate `xp_transactions`.

Not everything in the cache can be served from a copy in each process's memory, though. Some entries are security state
that must change for every API instance at once: "does this account still exist?" (a deleted account must stop working
immediately), the one-email-a-minute throttles, and the refresh-session state of ADR-0030.

## Decision

- **`HybridCache` (Microsoft.Extensions.Caching.Hybrid) behind the existing `ICacheService`**
  (`Infrastructure/Caching/HybridCacheService.cs`). Callers do not change, and Redis stays optional.
- **A local copy is opt-in.** `GetOrCreateWithLocalCopyAsync(key, ttl, localTtl, …)` keeps the value in the instance's
  memory as well: the catalog and the translations for 1 minute, leaderboard pages for 10 seconds. `GetOrCreateAsync` keeps
  no local copy, so every read asks Redis and a removal is seen everywhere at once. It is used for the security state.
- **One factory call per key at a time** on each instance, for both methods (HybridCache's stampede protection).
- **`GetAsync`/`SetAsync` keep plain JSON in Redis**, the format the refresh-session state has had since ADR-0030. These
  entries live 14 days. If HybridCache's format could not read them after the deploy, a revoked session would look unknown
  and be accepted again. So never use both GetOrCreate and Get/Set on the same key.
- **Without Redis** (development, `ConnectionStrings:Redis` empty), HybridCache ignores the in-memory
  `IDistributedCache` as a second level. Its own memory is then the only cache of the single process, so entries without
  a local copy are kept there too. The integration tests use a Redis stand-in that HybridCache treats as a real second
  level, so they run the production topology. The no-Redis mode is covered by unit tests.

## Consequences

- Hot reads skip the trip to Redis, and an expiry no longer sends a burst of identical queries to PostgreSQL.
- **Staleness on other instances.** With more than one API instance (stage 2 in `docs/future-work.md`), an admin edit of
  the catalog shows on the other instances within 1 minute (removal clears Redis and the local copy of the instance that
  made the edit). A leaderboard page can be up to about 40 s old (30 s in Redis plus a 10 s local copy). The leaderboard
  still removes opted-out and deleted learners on every read.
- HybridCache keeps a local copy as serialized bytes for mutable types such as our lists, so a local hit still
  deserializes. Marking the cached types immutable would avoid it, at the cost of every caller promising never to mutate
  a shared list. Not done.
- HybridCache does not store a value over its payload limit (1 MB by default) and says nothing. `CachingTests` checks that
  the catalog, the topics and the pt-BR translations really reach the shared cache.
- Entries written by the previous cache code are read as a miss and rebuilt (catalog, account exists, throttles); the
  refresh-session state is unaffected.
- Still open: cache hit-rate metrics, invalidation from outbox events, and the per-user home dashboard
  (`docs/future-work.md`).
