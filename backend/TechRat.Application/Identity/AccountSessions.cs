using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using TechRat.Application.Common;

namespace TechRat.Application.Identity;

/// <summary>
/// The sign-in cookie of the current request (web sessions). A port, because the cookie lives in the HTTP host
/// (ASP.NET Core's SignInManager) while the rules about when a session ends live here.
/// </summary>
public interface ISessionCookie
{
    /// <summary>Clears the cookie in the response. Harmless when the request did not sign in with one (bearer clients).</summary>
    Task SignOutAsync();
}

/// <summary>What the learner typed to prove it is really them.</summary>
/// <param name="Password">The current password, for accounts that have one.</param>
/// <param name="TypedUsername">The account's own username, for accounts without a password (external sign-in).</param>
public sealed record ReauthenticationProof(string? Password, string? TypedUsername);

/// <summary>What an account without a password (external sign-in) has to prove.</summary>
public enum WithoutPassword
{
    /// <summary>Nothing: it is setting its first password, which takes nothing away (ADR-0018).</summary>
    NothingToProve,

    /// <summary>It types its own username: a deliberate, explicit confirmation before something irreversible (ADR-0023).</summary>
    TypeUsername,
}

public enum ReauthenticationOutcome
{
    Verified,
    PasswordRequired,
    LockedOut,
    PasswordIncorrect,
    UsernameMismatch,
}

/// <param name="HasPassword">Whether the account has a password, so the caller knows to change it or to set the first one.</param>
public sealed record Reauthentication(ReauthenticationOutcome Outcome, bool HasPassword)
{
    public bool Succeeded => Outcome == ReauthenticationOutcome.Verified;

    /// <summary>
    /// The <see cref="Text"/> key of the message for a refusal (null when verified). The same refusal reads the same in
    /// every endpoint; only the field it is reported on is the endpoint's choice.
    /// </summary>
    public string? MessageKey => Outcome switch
    {
        ReauthenticationOutcome.PasswordRequired => Text.Keys.CurrentPasswordRequired,
        ReauthenticationOutcome.LockedOut => Text.Keys.LockedOut,
        ReauthenticationOutcome.PasswordIncorrect => Text.Keys.CurrentPasswordIncorrect,
        ReauthenticationOutcome.UsernameMismatch => Text.Keys.AccountDeleteConfirmation,
        _ => null,
    };
}

/// <summary>
/// Re-authenticating a signed-in learner and ending sessions, in one place (ADR-0037). Every endpoint that does something
/// sensitive with a live session (change the password, delete the account) asks this module whether the person is really
/// the owner, and every way of ending sessions (sign-out, password change, deletion) goes through it, so the rules cannot
/// drift apart between endpoints.
/// </summary>
public interface IAccountSessions
{
    /// <summary>
    /// Checks the current password, or for an account without one what <paramref name="withoutPassword"/> asks for.
    /// A locked account is refused before anything is checked; a wrong password counts towards lockout exactly like a
    /// failed login (ADR-0029), so a stolen session is not a way to guess the password. A missing password is not a guess.
    /// </summary>
    Task<Reauthentication> ReauthenticateAsync(ApplicationUser user, ReauthenticationProof proof, WithoutPassword withoutPassword, CancellationToken ct);

    /// <summary>
    /// Sign-out: clears this request's cookie and rotates the security stamp. The stamp is what refresh tokens are
    /// validated against, so every refresh token of the account stops working (bearer clients have no cookie to clear),
    /// and other cookies fail their next stamp validation. Access tokens live out their 30 minutes (ADR-0018).
    /// </summary>
    Task EndThisSessionAsync(Guid? userId, CancellationToken ct);

    /// <summary>
    /// After the password changed: every other session ends (security stamp), the calling session is left for the caller
    /// to renew, failed attempts are forgotten and the owner is told (ADR-0018). A lost notice is logged, never thrown.
    /// </summary>
    Task EndOtherSessionsAsync(ApplicationUser user, CancellationToken ct);

    /// <summary>
    /// After the account was deleted: refresh tokens already died with the user (their stamp cannot be validated), so this
    /// evicts the cached "account exists" answer, which makes the stateless access tokens of every device fail on their
    /// next request, clears this request's cookie and tells the former owner at the address captured before the deletion
    /// (ADR-0023). A lost notice is logged without the address, never thrown: the deletion cannot be undone.
    /// </summary>
    Task EndEverySessionAsync(Guid deletedUserId, string? formerAddress, CancellationToken ct);
}

/// <inheritdoc cref="IAccountSessions"/>
public sealed class AccountSessions(
    UserManager<ApplicationUser> users, ISessionCookie cookie, ICacheService cache, IAccountEmailSender email, ILoggerFactory loggers)
    : IAccountSessions
{
    private readonly ILogger _log = loggers.CreateLogger("TechRat.Identity");

    public async Task<Reauthentication> ReauthenticateAsync(
        ApplicationUser user, ReauthenticationProof proof, WithoutPassword withoutPassword, CancellationToken ct)
    {
        if (!await users.HasPasswordAsync(user))
        {
            var confirmed = withoutPassword == WithoutPassword.NothingToProve ||
                            string.Equals(proof.TypedUsername?.Trim(), user.UserName, StringComparison.OrdinalIgnoreCase);
            return new(confirmed ? ReauthenticationOutcome.Verified : ReauthenticationOutcome.UsernameMismatch, HasPassword: false);
        }

        if (string.IsNullOrEmpty(proof.Password)) return new(ReauthenticationOutcome.PasswordRequired, HasPassword: true);
        if (await users.IsLockedOutAsync(user)) return new(ReauthenticationOutcome.LockedOut, HasPassword: true);
        if (!await users.CheckPasswordAsync(user, proof.Password))
        {
            await users.AccessFailedAsync(user);
            return new(ReauthenticationOutcome.PasswordIncorrect, HasPassword: true);
        }
        return new(ReauthenticationOutcome.Verified, HasPassword: true);
    }

    public async Task EndThisSessionAsync(Guid? userId, CancellationToken ct)
    {
        await cookie.SignOutAsync();
        if (userId is { } id && await users.FindByIdAsync(id.ToString()) is { } user)
            await users.UpdateSecurityStampAsync(user);
    }

    public async Task EndOtherSessionsAsync(ApplicationUser user, CancellationToken ct)
    {
        // Changing or setting the password already rotated the stamp; rotating it here as well keeps this method true to
        // its name whoever calls it, and costs one write.
        await users.UpdateSecurityStampAsync(user);
        await users.ResetAccessFailedCountAsync(user);
        _log.LogInformation("Password changed for user {UserId}", user.Id);
        await NotifyAsync(() => email.SendPasswordChangedAsync(user.Email!, ct),
            () => _log.LogWarning("Password change notice could not be delivered to user {UserId}", user.Id));
    }

    public async Task EndEverySessionAsync(Guid deletedUserId, string? formerAddress, CancellationToken ct)
    {
        await cache.RemoveAsync(CacheEntries.AccountExists(deletedUserId), ct);
        await cookie.SignOutAsync();
        _log.LogInformation("Account deleted {UserId}", deletedUserId);
        if (!string.IsNullOrWhiteSpace(formerAddress))
            await NotifyAsync(() => email.SendAccountDeletedAsync(formerAddress, ct),
                () => _log.LogWarning("Account deletion notice could not be delivered for {UserId}", deletedUserId));
    }

    /// <summary>
    /// A security notice is sent after the change it reports, which has already happened: a delivery failure is logged
    /// with the user id only (never the address) and does not undo anything.
    /// </summary>
    private static async Task NotifyAsync(Func<Task> send, Action logFailure)
    {
        try
        {
            await send();
        }
        catch (EmailDeliveryException)
        {
            logFailure();
        }
    }
}
