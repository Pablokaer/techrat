using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using TechRat.Api.Infrastructure;
using TechRat.Application.Common;
using TechRat.Application.Identity;

namespace TechRat.Tests.Unit;

/// <summary>A cache that works, and one that forgets everything (a Redis restart, an eviction).</summary>
internal sealed class MemoryCache : ICacheService
{
    private readonly Dictionary<string, object> _values = [];
    public int Entries => _values.Count;

    public Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default)
    {
        if (_values.TryGetValue(key, out var existing)) return Task.FromResult((T)existing);
        return Create();
        async Task<T> Create() { var v = await factory(ct); _values[key] = v!; return v; }
    }

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) =>
        Task.FromResult(_values.TryGetValue(key, out var v) ? (T?)v : default);

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        _values[key] = value!;
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default) { _values.Remove(key); return Task.CompletedTask; }
    public void Forget() => _values.Clear();
}

internal sealed class ManualClock(DateTimeOffset start) : TimeProvider
{
    private DateTimeOffset _now = start;
    public override DateTimeOffset GetUtcNow() => _now;
    public void Advance(TimeSpan by) => _now += by;
}

/// <summary>
/// Refresh tokens are single use. Each refresh hands out a new one, so a stolen token shows up as soon as two parties
/// present the same one: the whole session is then revoked instead of quietly working for 14 days (ADR-0030).
/// </summary>
public class RefreshSessionTests
{
    private readonly ManualClock _clock = new(new DateTimeOffset(2026, 10, 10, 12, 0, 0, TimeSpan.Zero));
    private readonly MemoryCache _cache = new();

    private RefreshSessions Sessions(int graceSeconds = 30) =>
        new(_cache, _clock, Options.Create(new AuthSessionOptions { RefreshGraceSeconds = graceSeconds }));

    [Fact]
    public async Task A_new_session_gets_ids_that_are_hard_to_guess()
    {
        var a = await Sessions().StartAsync(CancellationToken.None);
        var b = await Sessions().StartAsync(CancellationToken.None);

        Assert.NotEqual(a.SessionId, b.SessionId);
        Assert.NotEqual(a.TokenId, b.TokenId);
        Assert.True(a.TokenId.Length >= 32);
    }

    [Fact]
    public async Task Refreshing_with_the_current_token_gives_a_new_one_in_the_same_session()
    {
        var sessions = Sessions();
        var first = await sessions.StartAsync(CancellationToken.None);

        var decision = await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None);

        Assert.Equal(RefreshVerdict.Issued, decision.Verdict);
        Assert.Equal(first.SessionId, decision.Next!.SessionId);
        Assert.NotEqual(first.TokenId, decision.Next.TokenId);
    }

    [Fact]
    public async Task A_chain_of_refreshes_keeps_working_while_each_uses_the_latest_token()
    {
        var sessions = Sessions();
        var current = await sessions.StartAsync(CancellationToken.None);
        for (var i = 0; i < 5; i++)
        {
            _clock.Advance(TimeSpan.FromMinutes(25));
            var decision = await sessions.RotateAsync(current.SessionId, current.TokenId, CancellationToken.None);
            Assert.Equal(RefreshVerdict.Issued, decision.Verdict);
            current = decision.Next!;
        }
    }

    [Fact]
    public async Task An_old_token_presented_after_the_grace_window_revokes_the_whole_session()
    {
        var sessions = Sessions();
        var first = await sessions.StartAsync(CancellationToken.None);
        var second = (await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None)).Next!;
        _clock.Advance(TimeSpan.FromMinutes(25));
        var third = (await sessions.RotateAsync(second.SessionId, second.TokenId, CancellationToken.None)).Next!;
        _clock.Advance(TimeSpan.FromMinutes(25));

        // The thief (or the owner) replays a token that was already used.
        var replay = await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None);
        Assert.Equal(RefreshVerdict.Reused, replay.Verdict);
        Assert.Null(replay.Next);

        // Both parties are now locked out of this session, including the one holding the newest token.
        var latest = await sessions.RotateAsync(third.SessionId, third.TokenId, CancellationToken.None);
        Assert.Equal(RefreshVerdict.Revoked, latest.Verdict);
    }

    [Fact]
    public async Task The_previous_token_is_forgiven_for_a_short_while_so_a_lost_response_can_be_retried()
    {
        var sessions = Sessions(graceSeconds: 30);
        var first = await sessions.StartAsync(CancellationToken.None);
        await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None); // the answer never reached the app
        _clock.Advance(TimeSpan.FromSeconds(10));

        var retry = await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None);

        Assert.Equal(RefreshVerdict.Issued, retry.Verdict);
        var onward = await sessions.RotateAsync(retry.Next!.SessionId, retry.Next.TokenId, CancellationToken.None);
        Assert.Equal(RefreshVerdict.Issued, onward.Verdict);
    }

    [Fact]
    public async Task The_previous_token_stops_being_forgiven_after_the_grace_window()
    {
        var sessions = Sessions(graceSeconds: 30);
        var first = await sessions.StartAsync(CancellationToken.None);
        await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None);
        _clock.Advance(TimeSpan.FromSeconds(31));

        Assert.Equal(RefreshVerdict.Reused, (await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None)).Verdict);
    }

    [Fact]
    public async Task A_grace_of_zero_means_every_reuse_is_caught_at_once()
    {
        var sessions = Sessions(graceSeconds: 0);
        var first = await sessions.StartAsync(CancellationToken.None);
        await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None);

        Assert.Equal(RefreshVerdict.Reused, (await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None)).Verdict);
    }

    [Fact]
    public async Task A_token_older_than_the_previous_one_is_never_forgiven()
    {
        var sessions = Sessions(graceSeconds: 600);
        var first = await sessions.StartAsync(CancellationToken.None);
        var second = (await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None)).Next!;
        await sessions.RotateAsync(second.SessionId, second.TokenId, CancellationToken.None);

        Assert.Equal(RefreshVerdict.Reused, (await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None)).Verdict);
    }

    [Fact]
    public async Task Another_session_of_the_same_person_is_not_touched_when_one_is_revoked()
    {
        var sessions = Sessions(graceSeconds: 0);
        var phone = await sessions.StartAsync(CancellationToken.None);
        var laptop = await sessions.StartAsync(CancellationToken.None);
        await sessions.RotateAsync(phone.SessionId, phone.TokenId, CancellationToken.None);
        await sessions.RotateAsync(phone.SessionId, phone.TokenId, CancellationToken.None); // reuse: the phone session dies

        Assert.Equal(RefreshVerdict.Issued, (await sessions.RotateAsync(laptop.SessionId, laptop.TokenId, CancellationToken.None)).Verdict);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", "")]
    [InlineData("a-session", null)]
    [InlineData(null, "a-token")]
    public async Task A_token_issued_before_sessions_were_tracked_is_accepted_and_starts_tracking(string? sessionId, string? tokenId)
    {
        var sessions = Sessions();

        var decision = await sessions.RotateAsync(sessionId, tokenId, CancellationToken.None);

        Assert.Equal(RefreshVerdict.Issued, decision.Verdict);
        var next = await sessions.RotateAsync(decision.Next!.SessionId, decision.Next.TokenId, CancellationToken.None);
        Assert.Equal(RefreshVerdict.Issued, next.Verdict);
    }

    [Fact]
    public async Task When_the_cache_has_forgotten_a_session_the_owner_is_not_logged_out_and_tracking_resumes()
    {
        var sessions = Sessions(graceSeconds: 0);
        var first = await sessions.StartAsync(CancellationToken.None);
        var second = (await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None)).Next!;
        _cache.Forget();

        var decision = await sessions.RotateAsync(second.SessionId, second.TokenId, CancellationToken.None);

        Assert.Equal(RefreshVerdict.Issued, decision.Verdict);
        Assert.Equal(second.SessionId, decision.Next!.SessionId);
        // ...and a replay is caught again from here on.
        Assert.Equal(RefreshVerdict.Reused, (await sessions.RotateAsync(second.SessionId, second.TokenId, CancellationToken.None)).Verdict);
    }

    [Fact]
    public async Task The_cache_never_holds_anything_but_ids()
    {
        var sessions = Sessions();
        var first = await sessions.StartAsync(CancellationToken.None);
        await sessions.RotateAsync(first.SessionId, first.TokenId, CancellationToken.None);

        Assert.Equal(1, _cache.Entries);
    }
}

public class ResponseCachingSecurityTests
{
    /// <summary>DefaultHttpContext never fires OnStarting callbacks (Kestrel does when the response begins); this one lets the test do it.</summary>
    private sealed class FiringResponseFeature : HttpResponseFeature
    {
        private readonly List<(Func<object, Task> Callback, object State)> _callbacks = [];
        public override void OnStarting(Func<object, Task> callback, object state) => _callbacks.Add((callback, state));
        public async Task FireAsync()
        {
            for (var i = _callbacks.Count - 1; i >= 0; i--) await _callbacks[i].Callback(_callbacks[i].State);
        }
    }

    private static async Task<HttpContext> Run(string path, bool signedIn = false, Action<HttpResponse>? endpoint = null)
    {
        var ctx = new DefaultHttpContext();
        var feature = new FiringResponseFeature();
        ctx.Features.Set<IHttpResponseFeature>(feature);
        ctx.Request.Path = path;
        if (signedIn) ctx.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())], "test"));
        var middleware = new NoStoreMiddleware(c => { endpoint?.Invoke(c.Response); return Task.CompletedTask; });
        await middleware.InvokeAsync(ctx);
        await feature.FireAsync();
        return ctx;
    }

    [Theory]
    [InlineData("/api/v1/auth/login")]
    [InlineData("/api/v1/auth/refresh")]
    [InlineData("/api/v1/auth/change-password")]
    [InlineData("/api/v1/account")]
    public async Task Responses_that_carry_tokens_or_change_the_account_are_never_stored(string path)
    {
        var ctx = await Run(path);

        Assert.Equal("no-store", ctx.Response.Headers.CacheControl.ToString());
        Assert.Equal("no-cache", ctx.Response.Headers.Pragma.ToString());
    }

    [Fact]
    public async Task Auth_endpoints_stay_uncached_even_if_the_endpoint_asked_for_caching()
    {
        var ctx = await Run("/api/v1/auth/login", endpoint: r => r.Headers.CacheControl = "public, max-age=600");

        Assert.Equal("no-store", ctx.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task What_a_signed_in_person_reads_is_not_kept_by_shared_caches()
    {
        var ctx = await Run("/api/v1/users/me", signedIn: true);

        Assert.Contains("no-store", ctx.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task Public_content_is_left_alone_for_anonymous_visitors()
    {
        var ctx = await Run("/api/v1/topics");

        Assert.False(ctx.Response.Headers.ContainsKey("Cache-Control"));
    }

    [Fact]
    public async Task An_endpoint_that_chose_its_own_policy_keeps_it_when_the_person_is_signed_in()
    {
        var ctx = await Run("/api/v1/users/someone/avatar", signedIn: true, endpoint: r => r.Headers.CacheControl = "private, max-age=60");

        Assert.Equal("private, max-age=60", ctx.Response.Headers.CacheControl.ToString());
    }
}

public class RequestBodyLimitTests
{
    private sealed class SizeFeature : IHttpMaxRequestBodySizeFeature
    {
        public bool IsReadOnly => false;
        public long? MaxRequestBodySize { get; set; } = 30_000_000;
    }

    private static async Task<(HttpContext Ctx, bool Reached, SizeFeature Feature)> Run(string path, long? contentLength)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Path = path;
        ctx.Request.ContentLength = contentLength;
        var feature = new SizeFeature();
        ctx.Features.Set<IHttpMaxRequestBodySizeFeature>(feature);
        var reached = false;
        await new SmallBodyMiddleware(_ => { reached = true; return Task.CompletedTask; }).InvokeAsync(ctx);
        return (ctx, reached, feature);
    }

    [Theory]
    [InlineData("/api/v1/auth/login")]
    [InlineData("/api/v1/auth/register")]
    [InlineData("/api/v1/auth/reset-password")]
    [InlineData("/api/v1/account")]
    public async Task A_credentials_request_has_a_small_body_limit_and_a_big_declared_body_is_refused_at_once(string path)
    {
        var (ctx, reached, _) = await Run(path, 200_000);

        Assert.Equal(StatusCodes.Status413PayloadTooLarge, ctx.Response.StatusCode);
        Assert.False(reached);
    }

    [Fact]
    public async Task Ordinary_credentials_requests_pass_and_the_server_limit_is_lowered_for_undeclared_sizes()
    {
        var (ctx, reached, feature) = await Run("/api/v1/auth/login", 300);

        Assert.True(reached);
        Assert.NotEqual(StatusCodes.Status413PayloadTooLarge, ctx.Response.StatusCode);
        Assert.Equal(SmallBodyMiddleware.MaxBytes, feature.MaxRequestBodySize);
    }

    [Fact]
    public async Task Other_endpoints_keep_the_server_default_so_avatar_uploads_still_work()
    {
        var (ctx, reached, feature) = await Run("/api/v1/users/me/avatar", 2_000_000);

        Assert.True(reached);
        Assert.Equal(30_000_000, feature.MaxRequestBodySize);
        Assert.NotEqual(StatusCodes.Status413PayloadTooLarge, ctx.Response.StatusCode);
    }

    [Fact]
    public void The_limit_leaves_room_for_the_longest_legitimate_request()
    {
        // Email (256) + a password at the sign-in cap (1,024) + a display name and username, as JSON.
        Assert.InRange(SmallBodyMiddleware.MaxBytes, 4 * 1024, 64 * 1024);
    }
}
