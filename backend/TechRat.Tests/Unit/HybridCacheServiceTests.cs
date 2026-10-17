using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Infrastructure;

namespace TechRat.Tests.Unit;

/// <summary>
/// The two-level cache (ADR-0034): a copy in each API instance's memory only where the caller asks for one, the shared
/// cache (Redis) for everything else, one factory call per key at a time, and an outage that never fails a request.
/// </summary>
public class HybridCacheServiceTests
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan Local = TimeSpan.FromMinutes(1);
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    private sealed record SessionState(string Current, bool Revoked);

    /// <summary>One API instance: the production registration, over the given shared cache.</summary>
    private static ICacheService Instance(IDistributedCache shared)
    {
        var services = new ServiceCollection().AddLogging();
        services.AddCaching(redisConnection: null);
        services.AddSingleton(shared);
        return services.BuildServiceProvider().GetRequiredService<ICacheService>();
    }

    [Fact]
    public async Task A_value_with_a_local_copy_is_served_from_memory_after_the_first_read()
    {
        var shared = new CountingCache();
        var cache = Instance(shared);
        var calls = 0;
        Task<string> Read() => cache.GetOrCreateWithLocalCopyAsync("catalog:k", Ttl, Local, _ => { calls++; return Task.FromResult("catalog"); });
        await Read();
        var readsAfterTheMiss = shared.Reads;
        Assert.Equal("catalog", await Read());
        Assert.Equal("catalog", await Read());
        Assert.Equal(1, calls);
        Assert.Equal(readsAfterTheMiss, shared.Reads);
    }

    [Fact]
    public async Task Without_a_local_copy_every_read_asks_the_shared_cache()
    {
        var shared = new CountingCache();
        var cache = Instance(shared);
        var calls = 0;
        Task<bool> Read() => cache.GetOrCreateAsync("account:exists:k", Ttl, _ => { calls++; return Task.FromResult(true); });
        await Read();
        var readsAfterTheMiss = shared.Reads;
        Assert.True(await Read());
        Assert.True(await Read());
        Assert.Equal(1, calls);
        Assert.Equal(readsAfterTheMiss + 2, shared.Reads);
    }

    [Fact]
    public async Task Without_redis_every_entry_is_still_cached_in_the_single_process()
    {
        // HybridCache ignores an in-memory IDistributedCache as its second level; the email throttle and the "account
        // exists" check must keep working in that setup (development, no ConnectionStrings:Redis).
        var cache = Instance(new MemoryDistributedCache(Options.Create(new Microsoft.Extensions.Caching.Memory.MemoryDistributedCacheOptions())));
        var calls = 0;
        Task<bool> Read() => cache.GetOrCreateAsync("auth:reset-email:k", Ttl, _ => { calls++; return Task.FromResult(true); });
        await Read();
        await Read();
        Assert.Equal(1, calls);
        await cache.RemoveAsync("auth:reset-email:k");
        await Read();
        Assert.Equal(2, calls);
    }

    [Fact]
    public async Task Removing_a_get_set_key_works_with_and_without_redis()
    {
        foreach (var shared in new IDistributedCache[] { new CountingCache(), new MemoryDistributedCache(Options.Create(new Microsoft.Extensions.Caching.Memory.MemoryDistributedCacheOptions())) })
        {
            var cache = Instance(shared);
            await cache.SetAsync("auth:refresh:s", new SessionState("t1", false), Ttl);
            await cache.RemoveAsync("auth:refresh:s");
            Assert.Null(await cache.GetAsync<SessionState>("auth:refresh:s"));
        }
    }

    [Fact]
    public async Task Concurrent_misses_run_the_factory_once()
    {
        var cache = Instance(new CountingCache());
        var calls = 0;
        var gate = new TaskCompletionSource();
        var readers = Enumerable.Range(0, 20).Select(_ => cache.GetOrCreateWithLocalCopyAsync("leaderboard:k", Ttl, Local, async c =>
        {
            Interlocked.Increment(ref calls);
            await gate.Task;
            return 42;
        })).ToList();
        gate.SetResult();
        Assert.All(await Task.WhenAll(readers), value => Assert.Equal(42, value));
        Assert.Equal(1, calls);
    }

    [Fact]
    public async Task Removing_a_key_drops_the_local_copy_too()
    {
        var cache = Instance(new CountingCache());
        var version = 0;
        Task<int> Read() => cache.GetOrCreateWithLocalCopyAsync("catalog:k", Ttl, Local, _ => Task.FromResult(++version));
        Assert.Equal(1, await Read());
        Assert.Equal(1, await Read());
        await cache.RemoveAsync("catalog:k");
        Assert.Equal(2, await Read());
    }

    [Fact]
    public async Task An_entry_without_a_local_copy_removed_on_one_instance_is_gone_for_every_instance_at_once()
    {
        // The "account exists" check: a deleted account must stop working on every API instance immediately.
        var shared = new CountingCache();
        var deleting = Instance(shared);
        var other = Instance(shared);
        Assert.True(await other.GetOrCreateAsync("account:exists:k", Ttl, _ => Task.FromResult(true)));
        await deleting.RemoveAsync("account:exists:k");
        Assert.False(await other.GetOrCreateAsync("account:exists:k", Ttl, _ => Task.FromResult(false)));
    }

    [Fact]
    public async Task Get_and_set_share_state_between_instances_at_once()
    {
        var shared = new CountingCache();
        await Instance(shared).SetAsync("auth:refresh:s", new SessionState("t1", Revoked: true), Ttl);
        Assert.Equal(new SessionState("t1", true), await Instance(shared).GetAsync<SessionState>("auth:refresh:s"));
        Assert.Null(await Instance(shared).GetAsync<SessionState>("auth:refresh:missing"));
    }

    [Fact]
    public async Task Session_state_written_before_this_cache_is_still_read_after_the_deploy()
    {
        // Refresh-session state lives for 14 days. Losing it would accept a revoked session again (ADR-0030), so Get/Set
        // keep the plain JSON the previous cache code wrote.
        var shared = new CountingCache();
        await shared.SetAsync("auth:refresh:s", JsonSerializer.SerializeToUtf8Bytes(new SessionState("t1", Revoked: true), WebJson));
        Assert.Equal(new SessionState("t1", true), await Instance(shared).GetAsync<SessionState>("auth:refresh:s"));
    }

    [Fact]
    public async Task A_catalog_entry_in_the_previous_format_is_rebuilt_not_misread()
    {
        var shared = new CountingCache();
        await shared.SetAsync("catalog:k", JsonSerializer.SerializeToUtf8Bytes(new[] { "old" }, WebJson));
        Assert.Equal(["new"], await Instance(shared).GetOrCreateWithLocalCopyAsync("catalog:k", Ttl, Local, _ => Task.FromResult<string[]>(["new"])));
    }

    [Fact]
    public async Task A_shared_cache_outage_never_fails_a_request()
    {
        var cache = Instance(new FailingCache());
        Assert.Equal(7, await cache.GetOrCreateAsync("account:exists:k", Ttl, _ => Task.FromResult(7)));
        Assert.Equal(8, await cache.GetOrCreateWithLocalCopyAsync("catalog:k", Ttl, Local, _ => Task.FromResult(8)));
        Assert.Null(await cache.GetAsync<SessionState>("auth:refresh:s"));
        await cache.SetAsync("auth:refresh:s", new SessionState("t1", false), Ttl);
        await cache.RemoveAsync("catalog:k");
    }

    [Fact]
    public async Task An_error_in_the_factory_reaches_the_caller_and_is_not_retried()
    {
        var cache = Instance(new CountingCache());
        var calls = 0;
        await Assert.ThrowsAsync<KeyNotFoundException>(() => cache.GetOrCreateAsync<int>("catalog:k", Ttl, _ => { calls++; throw new KeyNotFoundException(); }));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => cache.GetOrCreateWithLocalCopyAsync<int>("catalog:k2", Ttl, Local, _ => { calls++; throw new KeyNotFoundException(); }));
        Assert.Equal(2, calls);
    }

    /// <summary>An in-memory stand-in for Redis that counts reads.</summary>
    private sealed class CountingCache : IDistributedCache
    {
        private readonly MemoryDistributedCache _inner = new(Options.Create(new Microsoft.Extensions.Caching.Memory.MemoryDistributedCacheOptions()));
        private int _reads;
        public int Reads => _reads;

        public byte[]? Get(string key) { Interlocked.Increment(ref _reads); return _inner.Get(key); }
        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) { Interlocked.Increment(ref _reads); return _inner.GetAsync(key, token); }
        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => _inner.Set(key, value, options);
        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default) => _inner.SetAsync(key, value, options, token);
        public void Refresh(string key) => _inner.Refresh(key);
        public Task RefreshAsync(string key, CancellationToken token = default) => _inner.RefreshAsync(key, token);
        public void Remove(string key) => _inner.Remove(key);
        public Task RemoveAsync(string key, CancellationToken token = default) => _inner.RemoveAsync(key, token);
    }

    /// <summary>Redis is down: every call throws.</summary>
    private sealed class FailingCache : IDistributedCache
    {
        private static InvalidOperationException Down() => new("Redis is down");
        public byte[]? Get(string key) => throw Down();
        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => throw Down();
        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => throw Down();
        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default) => throw Down();
        public void Refresh(string key) => throw Down();
        public Task RefreshAsync(string key, CancellationToken token = default) => throw Down();
        public void Remove(string key) => throw Down();
        public Task RemoveAsync(string key, CancellationToken token = default) => throw Down();
    }
}
