using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using TechRat.Application.Common;

namespace TechRat.Infrastructure.Caching;

/// <summary>
/// Two-level cache-aside (ADR-0034). GetOrCreate goes through <see cref="HybridCache"/>: one factory call per key at a time
/// on each instance, and a copy in this instance's memory only when the entry declares one (ADR-0041). Get/Set read and write plain
/// JSON in the shared cache (Redis in docker/production, in-memory otherwise), the format the refresh-session state has had
/// since ADR-0030, so a deploy never loses it. Cache failures degrade to the database instead of failing the request.
/// </summary>
public sealed class HybridCacheService(HybridCache hybrid, IDistributedCache shared, ILogger<HybridCacheService> logger) : ICacheService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    // HybridCache ignores an in-memory IDistributedCache as its second level (no Redis configured). Its memory is then the
    // only cache of this single process, so entries without a local copy must still be kept there.
    private readonly HybridCacheEntryFlags _sharedOnly = shared is MemoryDistributedCache ? HybridCacheEntryFlags.None : HybridCacheEntryFlags.DisableLocalCache;

    /// <summary>
    /// The entry's declared policy becomes HybridCache options: with a local TTL the value is kept in this instance's memory
    /// that long; without one it is shared only (except without Redis, see <see cref="_sharedOnly"/>).
    /// </summary>
    public async Task<T> GetOrCreateAsync<T>(ComputedEntry entry, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default)
    {
        var options = entry.LocalTtl is { } localTtl
            ? new HybridCacheEntryOptions { Expiration = entry.Ttl, LocalCacheExpiration = localTtl }
            : new HybridCacheEntryOptions { Expiration = entry.Ttl, LocalCacheExpiration = entry.Ttl, Flags = _sharedOnly };
        return await hybrid.GetOrCreateAsync(entry.Key, factory, static async (f, c) => await f(c), options, cancellationToken: ct);
    }

    public async Task<T?> GetAsync<T>(StateEntry entry, CancellationToken ct = default)
    {
        try
        {
            var bytes = await shared.GetAsync(entry.Key, ct);
            return bytes is null ? default : JsonSerializer.Deserialize<T>(bytes, Json);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Cache read failed for {CacheKey}", entry.Key);
            return default;
        }
    }

    public async Task SetAsync<T>(StateEntry entry, T value, CancellationToken ct = default)
    {
        try
        {
            await shared.SetAsync(entry.Key, JsonSerializer.SerializeToUtf8Bytes(value, Json),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = entry.Ttl }, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Cache write failed for {CacheKey}", entry.Key);
        }
    }

    /// <summary>
    /// Removes the key from the shared cache and from this instance's memory (other instances keep a local copy until it
    /// expires). Both calls are needed: without Redis, HybridCache does not see the in-memory store that Get/Set use.
    /// </summary>
    public async Task RemoveAsync(CacheEntry entry, CancellationToken ct = default)
    {
        try
        {
            await hybrid.RemoveAsync(entry.Key, ct);
            await shared.RemoveAsync(entry.Key, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogWarning(ex, "Cache remove failed for {CacheKey}", entry.Key); }
    }
}
