using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;

namespace TechRat.Application.Identity;

/// <summary>Claims that tie a bearer token to its sign-in session (the ids of <see cref="RefreshSessions"/>).</summary>
public static class SessionClaims
{
    public const string SessionId = "techrat:sid";
    public const string TokenId = "techrat:rtid";
}

/// <summary>Settings of the sign-in sessions of bearer clients (section "Auth").</summary>
public sealed class AuthSessionOptions
{
    public const string Section = "Auth";

    /// <summary>
    /// Seconds during which the previous refresh token is still accepted after a refresh, so an app whose response was
    /// lost can retry. 0 turns the allowance off.
    /// </summary>
    public int RefreshGraceSeconds { get; set; } = 30;
}

public enum RefreshVerdict
{
    /// <summary>The refresh is allowed; <see cref="RefreshDecision.Next"/> holds the ids for the new token.</summary>
    Issued,

    /// <summary>A token that was already used was presented: the session has just been revoked.</summary>
    Reused,

    /// <summary>The session was revoked earlier; nothing refreshes it any more.</summary>
    Revoked,
}

/// <param name="SessionId">One per sign-in (per device); every refresh token of that sign-in carries it.</param>
/// <param name="TokenId">Changes with every refresh token; only the latest one is current.</param>
public sealed record RefreshTokenIds(string SessionId, string TokenId);

public sealed record RefreshDecision(RefreshVerdict Verdict, RefreshTokenIds? Next);

/// <summary>What the server remembers about one sign-in: only random ids, never the tokens themselves.</summary>
public sealed record RefreshSessionState(string Current, string? Previous, DateTimeOffset RotatedAt, bool Revoked);

/// <summary>
/// Single-use refresh tokens (OAuth 2.0 Security BCP, "refresh token rotation"). Identity's refresh tokens are stateless, so
/// a stolen one kept working for 14 days and nobody could tell. Now every refresh hands out a new token, and the server keeps
/// the id of the current one per sign-in. When an older token comes back, two parties hold the same session, so that session
/// is revoked (the person's other devices are not touched). The state lives in the cache with the refresh lifetime as its TTL;
/// a cache that lost it is treated like a token issued before this existed: accepted, then tracked again, so an outage
/// never signs anybody out. See ADR-0030.
/// </summary>
public sealed class RefreshSessions(ICacheService cache, TimeProvider clock, IOptions<AuthSessionOptions> options)
{
    private static string Key(string sessionId) => $"auth:refresh:{sessionId}";
    private static string NewId() => Convert.ToHexString(RandomNumberGenerator.GetBytes(16));

    /// <summary>Starts tracking a new sign-in and returns the ids to put in its first tokens.</summary>
    public async Task<RefreshTokenIds> StartAsync(CancellationToken ct) => await TrackAsync(NewId(), previous: null, ct);

    /// <summary>
    /// Decides what to do with a refresh token carrying these ids. A token without ids predates session tracking and is
    /// accepted into a new session.
    /// </summary>
    public async Task<RefreshDecision> RotateAsync(string? sessionId, string? presentedTokenId, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(sessionId) || string.IsNullOrEmpty(presentedTokenId))
            return new(RefreshVerdict.Issued, await StartAsync(ct));

        var state = await cache.GetAsync<RefreshSessionState>(Key(sessionId), ct);
        if (state is null) return new(RefreshVerdict.Issued, await TrackAsync(sessionId, previous: null, ct));
        if (state.Revoked) return new(RefreshVerdict.Revoked, null);

        if (presentedTokenId == state.Current)
            return new(RefreshVerdict.Issued, await TrackAsync(sessionId, previous: state.Current, ct));

        var grace = TimeSpan.FromSeconds(Math.Max(0, options.Value.RefreshGraceSeconds));
        if (presentedTokenId == state.Previous && clock.GetUtcNow() - state.RotatedAt < grace)
            return new(RefreshVerdict.Issued, await TrackAsync(sessionId, state.Previous, ct, rotatedAt: state.RotatedAt));

        await cache.SetAsync(Key(sessionId), state with { Revoked = true }, AuthPolicy.RefreshTokenLifetime, ct);
        return new(RefreshVerdict.Reused, null);
    }

    private async Task<RefreshTokenIds> TrackAsync(string sessionId, string? previous, CancellationToken ct, DateTimeOffset? rotatedAt = null)
    {
        var ids = new RefreshTokenIds(sessionId, NewId());
        await cache.SetAsync(Key(sessionId), new RefreshSessionState(ids.TokenId, previous, rotatedAt ?? clock.GetUtcNow(), Revoked: false),
            AuthPolicy.RefreshTokenLifetime, ct);
        return ids;
    }
}
