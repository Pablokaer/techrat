using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Application.Identity;
using TechRat.Infrastructure;

namespace TechRat.Tests.Unit;

/// <summary>
/// Every cache entry is declared once in <see cref="CacheEntries"/> (ADR-0041). These tests pin each declaration: its key
/// (existing Redis data must keep being found after a deploy), its TTL, whether instances keep a local copy, and its kind.
/// Changing any of them has to be a deliberate change here.
/// </summary>
public class CacheEntriesTests
{
    private static readonly Guid User = Guid.Parse("0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d");

    public static TheoryData<string, CacheEntry, string, TimeSpan, TimeSpan?> ComputedEntries => new()
    {
        { "topics", CacheEntries.Topics, "catalog:topics:v1", TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(1) },
        { "roadmaps", CacheEntries.Roadmaps, "catalog:roadmaps:v1", TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(1) },
        { "translations", CacheEntries.Translations("pt-BR"), "catalog:translations:pt-BR:v2", TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(1) },
        { "leaderboard", CacheEntries.Leaderboard("Weekly", "kubernetes", 2, 50), "leaderboard:Weekly:kubernetes:2:50", TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(10) },
        { "leaderboard, every topic", CacheEntries.Leaderboard("AllTime", null, 1, 100), "leaderboard:AllTime:all:1:100", TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(10) },
        { "account exists", CacheEntries.AccountExists(User), "account:exists:0a1b2c3d4e5f4a6b8c7d9e0f1a2b3c4d", TimeSpan.FromMinutes(2), null },
        { "reset email", CacheEntries.EmailThrottle("reset", "AB12"), "auth:reset-email:AB12", TimeSpan.FromMinutes(1), null },
        { "confirmation email", CacheEntries.EmailThrottle("confirm", "AB12"), "auth:confirm-email:AB12", TimeSpan.FromMinutes(1), null },
        { "already-registered email", CacheEntries.EmailThrottle("registered", "AB12"), "auth:registered-email:AB12", TimeSpan.FromMinutes(1), null },
    };

    [Theory]
    [MemberData(nameof(ComputedEntries))]
    public void Each_computed_entry_keeps_its_key_ttl_and_local_copy_policy(string name, CacheEntry entry, string key, TimeSpan ttl, TimeSpan? localTtl)
    {
        var computed = Assert.IsType<ComputedEntry>(entry);
        Assert.Equal(key, computed.Key);
        Assert.Equal(ttl, computed.Ttl);
        Assert.Equal(localTtl, computed.LocalTtl);
        Assert.Equal(localTtl is not null, computed.KeepsLocalCopy);
        Assert.False(string.IsNullOrEmpty(name));
    }

    [Fact]
    public void Security_state_never_keeps_a_local_copy()
    {
        // A copy in another instance's memory would let a deleted account or a throttled address through for its lifetime.
        Assert.False(CacheEntries.AccountExists(User).KeepsLocalCopy);
        Assert.False(CacheEntries.EmailThrottle("reset", "AB12").KeepsLocalCopy);
    }

    [Fact]
    public void A_refresh_session_is_stored_state_kept_for_the_refresh_lifetime_under_its_original_key()
    {
        var entry = CacheEntries.RefreshSession("5F3A");
        Assert.IsType<StateEntry>(entry);
        Assert.Equal("auth:refresh:5F3A", entry.Key);
        Assert.Equal(TimeSpan.FromDays(14), entry.Ttl);
        Assert.Equal(AuthPolicy.RefreshTokenLifetime, entry.Ttl);
    }

    [Fact]
    public void The_redis_health_probe_key_is_unchanged()
    {
        Assert.Equal("health:ping", CacheEntries.HealthProbeKey);
    }

    [Fact]
    public void Computed_values_and_stored_state_are_separate_types_so_one_key_cannot_be_used_both_ways()
    {
        // ADR-0034: GetOrCreate and Get/Set store different formats. The rule is enforced by the compiler: GetOrCreateAsync
        // accepts only a ComputedEntry and Get/Set only a StateEntry, and neither type converts to the other.
        Assert.True(typeof(ComputedEntry).IsSealed);
        Assert.True(typeof(StateEntry).IsSealed);
        Assert.False(typeof(ComputedEntry).IsAssignableTo(typeof(StateEntry)));
        Assert.False(typeof(StateEntry).IsAssignableTo(typeof(ComputedEntry)));

        var methods = typeof(ICacheService).GetMethods();
        Assert.Equal(typeof(ComputedEntry), methods.Single(m => m.Name == nameof(ICacheService.GetOrCreateAsync)).GetParameters()[0].ParameterType);
        Assert.Equal(typeof(StateEntry), methods.Single(m => m.Name == nameof(ICacheService.GetAsync)).GetParameters()[0].ParameterType);
        Assert.Equal(typeof(StateEntry), methods.Single(m => m.Name == nameof(ICacheService.SetAsync)).GetParameters()[0].ParameterType);
        Assert.DoesNotContain(methods, m => m.GetParameters().Any(p => p.ParameterType == typeof(string)));
    }

    [Fact]
    public void Entries_can_only_be_declared_inside_the_application_layer()
    {
        // No public constructor: a caller cannot invent an entry with its own TTL; it has to use (or add) a declaration.
        foreach (var type in new[] { typeof(CacheEntry), typeof(ComputedEntry), typeof(StateEntry) })
            Assert.Empty(type.GetConstructors(BindingFlags.Public | BindingFlags.Instance));
    }

    [Fact]
    public void No_computed_entry_shares_a_key_prefix_with_stored_state()
    {
        var state = CacheEntries.RefreshSession("x").Key[..^1];
        foreach (var row in ComputedEntries)
            Assert.False(((CacheEntry)row[1]).Key.StartsWith(state, StringComparison.Ordinal));
    }

    [Fact]
    public async Task Refresh_session_state_written_as_plain_json_before_this_change_is_still_honoured()
    {
        // ADR-0030: a session revoked before the deploy must stay revoked. Write the state exactly as the previous code did
        // (plain web JSON under auth:refresh:{id}) and present a token through the production cache.
        var shared = new MemoryDistributedCache(Options.Create(new Microsoft.Extensions.Caching.Memory.MemoryDistributedCacheOptions()));
        var legacy = new RefreshSessionState("CURRENT", null, DateTimeOffset.UtcNow, Revoked: true);
        await shared.SetAsync("auth:refresh:5F3A", JsonSerializer.SerializeToUtf8Bytes(legacy, new JsonSerializerOptions(JsonSerializerDefaults.Web)));

        var services = new ServiceCollection().AddLogging();
        services.AddCaching(redisConnection: null);
        services.AddSingleton<IDistributedCache>(shared);
        var cache = services.BuildServiceProvider().GetRequiredService<ICacheService>();

        Assert.Equal(legacy, await cache.GetAsync<RefreshSessionState>(CacheEntries.RefreshSession("5F3A")));
        var sessions = new RefreshSessions(cache, TimeProvider.System, Options.Create(new AuthSessionOptions()));
        Assert.Equal(RefreshVerdict.Revoked, (await sessions.RotateAsync("5F3A", "CURRENT", CancellationToken.None)).Verdict);

        // And what this code writes is still that plain JSON, so a rollback reads it too.
        await cache.SetAsync(CacheEntries.RefreshSession("9C"), legacy with { Revoked = false });
        var written = JsonSerializer.Deserialize<RefreshSessionState>(await shared.GetAsync("auth:refresh:9C") ?? [], new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal(legacy with { Revoked = false }, written);
    }
}
