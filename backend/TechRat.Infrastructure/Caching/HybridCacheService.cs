using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using TechRat.Application.Common;

namespace TechRat.Infrastructure.Caching;

/// <summary>
/// Two-level cache-aside (ADR-0034). GetOrCreate goes through <see cref="HybridCache"/>: one factory call per key at a time
/// on each instance, and a copy in this instance's memory only when the caller asks for one. Get/Set read and write plain
/// JSON in the shared cache (Redis in docker/production, in-memory otherwise), the format the refresh-session state has had
/// since ADR-0030, so a deploy never loses it. Cache failures degrade to the database instead of failing the request.
/// </summary>
public sealed class HybridCacheService(HybridCache hybrid, IDistributedCache shared, ILogger<HybridCacheService> logger) : ICacheService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    // HybridCache ignores an in-memory IDistributedCache as its second level (no Redis configured). Its memory is then the
    // only cache of this single process, so entries without a local copy must still be kept there.
    private readonly HybridCacheEntryFlags _sharedOnly = shared is MemoryDistributedCache ? HybridCacheEntryFlags.None : HybridCacheEntryFlags.DisableLocalCache;

    public Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default) =>
        HybridGetOrCreateAsync(key, new HybridCacheEntryOptions { Expiration = ttl, LocalCacheExpiration = ttl, Flags = _sharedOnly }, factory, ct);

    public Task<T> GetOrCreateWithLocalCopyAsync<T>(string key, TimeSpan ttl, TimeSpan localTtl, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default) =>
        HybridGetOrCreateAsync(key, new HybridCacheEntryOptions { Expiration = ttl, LocalCacheExpiration = localTtl }, factory, ct);

    private async Task<T> HybridGetOrCreateAsync<T>(string key, HybridCacheEntryOptions options, Func<CancellationToken, Task<T>> factory, CancellationToken ct) =>
        await hybrid.GetOrCreateAsync(key, factory, static async (f, c) => await f(c), options, cancellationToken: ct);

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        try
        {
            var bytes = await shared.GetAsync(key, ct);
            return bytes is null ? default : JsonSerializer.Deserialize<T>(bytes, Json);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Cache read failed for {CacheKey}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        try
        {
            await shared.SetAsync(key, JsonSerializer.SerializeToUtf8Bytes(value, Json),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl }, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Cache write failed for {CacheKey}", key);
        }
    }

    /// <summary>
    /// Removes the key from the shared cache and from this instance's memory (other instances keep a local copy until it
    /// expires). Both calls are needed: without Redis, HybridCache does not see the in-memory store that Get/Set use.
    /// </summary>
    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        try
        {
            await hybrid.RemoveAsync(key, ct);
            await shared.RemoveAsync(key, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogWarning(ex, "Cache remove failed for {CacheKey}", key); }
    }
}
