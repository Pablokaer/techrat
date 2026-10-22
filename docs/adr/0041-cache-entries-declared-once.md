# ADR-0041: Each cache entry is declared once, with its policy

**Status:** Accepted · Amends how ADR-0034's rules are enforced; ADR-0030 (refresh-session state) and ADR-0003 (Redis as
a cache only) are unchanged

## Context

`ICacheService` (ADR-0034) made every caller choose everything about its entry: the method (`GetOrCreateAsync` for shared
security state, `GetOrCreateWithLocalCopyAsync` for content, `GetAsync`/`SetAsync` for plain-JSON state), the TTL, the
local TTL and the key.

- The catalog pair `10 min / 1 min` was repeated in `CatalogService`, `RoadmapService` and `ContentLocalizer`; the
  leaderboard (`30 s / 10 s`) and "account exists" (`2 min`) TTLs lived as private constants in their callers.
- The email throttle (`auth:{purpose}-email:{hash}`) and the refresh sessions (`auth:refresh:{id}`) built their key
  literals outside `CacheKeys`, and the health check read `health:ping`.
- ADR-0034's rule "never use both GetOrCreate and Get/Set on the same key" (the two store different formats, and losing
  the 14-day refresh-session state would accept a revoked session again) was enforced only by a doc comment. Nothing
  stopped a security entry from being given a local copy either.

## Decision

- **`CacheEntries` (`Application/Common/Abstractions.cs`) declares every entry once:** key shape, TTL, local copy (yes,
  and for how long, or no) and kind. Callers ask for the entry (`cache.GetOrCreateAsync(CacheEntries.Topics, …)`) and no
  longer pass TTLs or choose between methods. `CacheKeys` is gone; `CacheEntries.HealthProbeKey` names the key the
  Redis health check reads straight from `IDistributedCache`.
- **Two entry types make the "never mix" rule a compile-time guarantee.** `ComputedEntry` (value built by a factory on a
  miss, HybridCache's format, optional `LocalTtl`) is the only argument `GetOrCreateAsync` accepts; `StateEntry` (plain
  JSON in the shared cache, never a local copy) is the only one `GetAsync`/`SetAsync` accept. Both are sealed, neither
  converts to the other, and `RemoveAsync` takes their common base `CacheEntry`. A key can only be used both ways if
  someone declares it twice, under both types, in the one class that declares entries.
- **Entries can only be declared in the Application layer** (internal constructors), so a caller in another project
  cannot invent an entry with its own TTL.
- **Nothing in storage changes.** Every key string, TTL and local TTL is byte-for-byte the same as before, the
  HybridCache options built from an entry are the ones the old methods built, Get/Set still write plain web JSON, and
  cache outages behave as before (GetOrCreate runs the factory, Get reads a miss, Set and Remove log), so an outage never
  signs anybody out (ADR-0030). No Redis data has to be migrated or rebuilt on deploy.

| Entry | Key | TTL | Local copy | Kind |
| --- | --- | --- | --- | --- |
| `Topics` | `catalog:topics:v1` | 10 min | 1 min | computed |
| `Roadmaps` | `catalog:roadmaps:v1` | 10 min | 1 min | computed |
| `Translations(locale)` | `catalog:translations:{locale}:v2` | 10 min | 1 min | computed |
| `Leaderboard(scope, topic, page, size)` | `leaderboard:{scope}:{topic or all}:{page}:{size}` | 30 s | 10 s | computed |
| `AccountExists(userId)` | `account:exists:{userId:N}` | 2 min | no | computed |
| `EmailThrottle(purpose, hash)` | `auth:{purpose}-email:{hash}` | 1 min | no | computed |
| `RefreshSession(id)` | `auth:refresh:{id}` | 14 days | no | state |

## Consequences

- Changing a TTL, a key or the local-copy policy is one edit in `CacheEntries`, and `CacheEntriesTests` pins each
  declaration, so it is also a deliberate test change. The same tests check that security state has no local copy, that
  no computed key shares the refresh-session prefix, and that refresh-session state written as plain JSON before this
  change is still read (a revoked session stays revoked) and that what is written now is still that JSON.
- The type of the cached value is still chosen at the call site (`GetOrCreateAsync<T>`), because several cached types
  are private to their services. Entries typed by their value were considered and left out for that reason.
- The two adapters (`HybridCacheService` in production, the in-memory fakes in the unit tests) implement the same
  four-method interface; the fakes no longer inherit a default `GetOrCreateWithLocalCopyAsync`.
- A new cache entry is added to `CacheEntries` and to `CacheEntriesTests`, choosing `ComputedEntry` or `StateEntry`.
