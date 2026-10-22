using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Application.Identity;

namespace TechRat.Tests.Unit;

/// <summary>
/// An Identity user store in memory: enough of the store interfaces for the real <see cref="UserManager{TUser}"/> to check
/// passwords, count failed attempts, lock accounts out and rotate security stamps, so the tests exercise Identity's own rules.
/// </summary>
internal sealed class InMemoryUserStore :
    IUserPasswordStore<ApplicationUser>, IUserLockoutStore<ApplicationUser>, IUserSecurityStampStore<ApplicationUser>
{
    private readonly Dictionary<Guid, ApplicationUser> _users = [];

    public void Add(ApplicationUser user) => _users[user.Id] = user;

    public Task<IdentityResult> CreateAsync(ApplicationUser user, CancellationToken ct) { Add(user); return Task.FromResult(IdentityResult.Success); }
    public Task<IdentityResult> UpdateAsync(ApplicationUser user, CancellationToken ct) { Add(user); return Task.FromResult(IdentityResult.Success); }
    public Task<IdentityResult> DeleteAsync(ApplicationUser user, CancellationToken ct) { _users.Remove(user.Id); return Task.FromResult(IdentityResult.Success); }
    public Task<ApplicationUser?> FindByIdAsync(string userId, CancellationToken ct) =>
        Task.FromResult(Guid.TryParse(userId, out var id) && _users.TryGetValue(id, out var u) ? u : null);
    public Task<ApplicationUser?> FindByNameAsync(string normalizedUserName, CancellationToken ct) =>
        Task.FromResult(_users.Values.FirstOrDefault(u => u.NormalizedUserName == normalizedUserName));
    public Task<string> GetUserIdAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.Id.ToString());
    public Task<string?> GetUserNameAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.UserName);
    public Task SetUserNameAsync(ApplicationUser user, string? userName, CancellationToken ct) { user.UserName = userName; return Task.CompletedTask; }
    public Task<string?> GetNormalizedUserNameAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.NormalizedUserName);
    public Task SetNormalizedUserNameAsync(ApplicationUser user, string? normalizedName, CancellationToken ct) { user.NormalizedUserName = normalizedName; return Task.CompletedTask; }

    public Task SetPasswordHashAsync(ApplicationUser user, string? passwordHash, CancellationToken ct) { user.PasswordHash = passwordHash; return Task.CompletedTask; }
    public Task<string?> GetPasswordHashAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.PasswordHash);
    public Task<bool> HasPasswordAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.PasswordHash is not null);

    public Task<DateTimeOffset?> GetLockoutEndDateAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.LockoutEnd);
    public Task SetLockoutEndDateAsync(ApplicationUser user, DateTimeOffset? lockoutEnd, CancellationToken ct) { user.LockoutEnd = lockoutEnd; return Task.CompletedTask; }
    public Task<int> IncrementAccessFailedCountAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(++user.AccessFailedCount);
    public Task ResetAccessFailedCountAsync(ApplicationUser user, CancellationToken ct) { user.AccessFailedCount = 0; return Task.CompletedTask; }
    public Task<int> GetAccessFailedCountAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.AccessFailedCount);
    public Task<bool> GetLockoutEnabledAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.LockoutEnabled);
    public Task SetLockoutEnabledAsync(ApplicationUser user, bool enabled, CancellationToken ct) { user.LockoutEnabled = enabled; return Task.CompletedTask; }

    public Task SetSecurityStampAsync(ApplicationUser user, string stamp, CancellationToken ct) { user.SecurityStamp = stamp; return Task.CompletedTask; }
    public Task<string?> GetSecurityStampAsync(ApplicationUser user, CancellationToken ct) => Task.FromResult(user.SecurityStamp);

    public void Dispose() { }
}

/// <summary>Counts cookie sign-outs instead of touching an HTTP response.</summary>
internal sealed class RecordingSessionCookie : ISessionCookie
{
    public int SignOuts { get; private set; }
    public Task SignOutAsync() { SignOuts++; return Task.CompletedTask; }
}

/// <summary>Records the security notices, or fails like an SMTP server that cannot be reached.</summary>
internal sealed class RecordingAccountEmail(bool fail = false) : IAccountEmailSender
{
    public List<string> PasswordChanged { get; } = [];
    public List<string> AccountDeleted { get; } = [];

    public Task SendPasswordChangedAsync(string email, CancellationToken ct)
    {
        if (fail) throw new EmailDeliveryException("smtp down");
        PasswordChanged.Add(email);
        return Task.CompletedTask;
    }

    public Task SendAccountDeletedAsync(string email, CancellationToken ct)
    {
        if (fail) throw new EmailDeliveryException("smtp down");
        AccountDeleted.Add(email);
        return Task.CompletedTask;
    }
}

/// <summary>
/// Re-authenticating a signed-in learner and ending sessions, through the one module that owns them (ADR-0037): a stolen
/// session or an unlocked phone must not be enough to change the password or delete the account, wrong guesses count
/// towards lockout like failed logins (ADR-0018, ADR-0023, ADR-0029), and each way of ending sessions does what it promised.
/// </summary>
public class AccountSessionsTests
{
    private const string Password = "Passw0rdX";

    private readonly InMemoryUserStore _store = new();
    private readonly MemoryCache _cache = new();
    private readonly RecordingSessionCookie _cookie = new();
    private readonly UserManager<ApplicationUser> _users;

    public AccountSessionsTests()
    {
        var options = Options.Create(new IdentityOptions
        {
            Lockout = { MaxFailedAccessAttempts = AuthPolicy.MaxFailedAccessAttempts, DefaultLockoutTimeSpan = AuthPolicy.LockoutDuration },
        });
        _users = new UserManager<ApplicationUser>(_store, options, new PasswordHasher<ApplicationUser>(), [], [],
            new UpperInvariantLookupNormalizer(), new IdentityErrorDescriber(), null!, NullLogger<UserManager<ApplicationUser>>.Instance);
    }

    private AccountSessions Sessions(IAccountEmailSender? email = null) =>
        new(_users, _cookie, _cache, email ?? new RecordingAccountEmail(), NullLoggerFactory.Instance);

    private async Task<ApplicationUser> AccountAsync(bool withPassword = true)
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(), UserName = "ana_dev", NormalizedUserName = "ANA_DEV", Email = "ana@example.com",
            LockoutEnabled = true, SecurityStamp = Guid.NewGuid().ToString(),
        };
        if (withPassword) user.PasswordHash = _users.PasswordHasher.HashPassword(user, Password);
        _store.Add(user);
        return await Task.FromResult(user);
    }

    private static ReauthenticationProof WithPassword(string? password) => new(password, TypedUsername: null);

    [Fact]
    public async Task The_right_password_verifies_the_learner_and_counts_no_failed_attempt()
    {
        var user = await AccountAsync();

        var result = await Sessions().ReauthenticateAsync(user, WithPassword(Password), WithoutPassword.TypeUsername, CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.True(result.HasPassword);
        Assert.Null(result.MessageKey);
        Assert.Equal(0, user.AccessFailedCount);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task A_missing_password_is_asked_for_and_is_not_counted_as_a_guess(string? password)
    {
        var user = await AccountAsync();

        var result = await Sessions().ReauthenticateAsync(user, WithPassword(password), WithoutPassword.TypeUsername, CancellationToken.None);

        Assert.Equal(ReauthenticationOutcome.PasswordRequired, result.Outcome);
        Assert.Equal(Text.Keys.CurrentPasswordRequired, result.MessageKey);
        Assert.Equal(0, user.AccessFailedCount);
    }

    [Fact]
    public async Task A_wrong_password_is_refused_and_counts_towards_lockout()
    {
        var user = await AccountAsync();

        var result = await Sessions().ReauthenticateAsync(user, WithPassword("Wr0ngPassword"), WithoutPassword.TypeUsername, CancellationToken.None);

        Assert.Equal(ReauthenticationOutcome.PasswordIncorrect, result.Outcome);
        Assert.Equal(Text.Keys.CurrentPasswordIncorrect, result.MessageKey);
        Assert.Equal(1, user.AccessFailedCount);
    }

    [Fact]
    public async Task Enough_wrong_guesses_lock_the_account_and_then_even_the_right_password_is_refused()
    {
        var user = await AccountAsync();
        var sessions = Sessions();
        for (var i = 0; i < AuthPolicy.MaxFailedAccessAttempts; i++)
            await sessions.ReauthenticateAsync(user, WithPassword("Wr0ngPassword"), WithoutPassword.TypeUsername, CancellationToken.None);

        var result = await sessions.ReauthenticateAsync(user, WithPassword(Password), WithoutPassword.TypeUsername, CancellationToken.None);

        Assert.Equal(ReauthenticationOutcome.LockedOut, result.Outcome);
        Assert.Equal(Text.Keys.LockedOut, result.MessageKey);
        Assert.True(await _users.IsLockedOutAsync(user));
    }

    [Fact]
    public async Task A_locked_account_is_refused_before_the_password_is_checked()
    {
        var user = await AccountAsync();
        user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(10);

        var result = await Sessions().ReauthenticateAsync(user, WithPassword("Wr0ngPassword"), WithoutPassword.TypeUsername, CancellationToken.None);

        Assert.Equal(ReauthenticationOutcome.LockedOut, result.Outcome);
        Assert.Equal(0, user.AccessFailedCount);
    }

    [Theory]
    [InlineData("ana_dev")]
    [InlineData("  ANA_Dev ")]
    public async Task Without_a_password_typing_the_own_username_confirms_whatever_the_case_and_spaces(string typed)
    {
        var user = await AccountAsync(withPassword: false);

        var result = await Sessions().ReauthenticateAsync(user, new(Password: null, TypedUsername: typed), WithoutPassword.TypeUsername, CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.False(result.HasPassword);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("someone_else")]
    public async Task Without_a_password_anything_but_the_own_username_is_refused(string? typed)
    {
        var user = await AccountAsync(withPassword: false);

        var result = await Sessions().ReauthenticateAsync(user, new(Password: "whatever", TypedUsername: typed), WithoutPassword.TypeUsername, CancellationToken.None);

        Assert.Equal(ReauthenticationOutcome.UsernameMismatch, result.Outcome);
        Assert.Equal(Text.Keys.AccountDeleteConfirmation, result.MessageKey);
    }

    [Fact]
    public async Task Without_a_password_there_is_nothing_to_prove_when_setting_the_first_one()
    {
        var user = await AccountAsync(withPassword: false);

        var result = await Sessions().ReauthenticateAsync(user, WithPassword(null), WithoutPassword.NothingToProve, CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.False(result.HasPassword);
    }

    [Fact]
    public async Task Ending_this_session_signs_the_cookie_out_and_rotates_the_security_stamp()
    {
        var user = await AccountAsync();
        var stamp = user.SecurityStamp;

        await Sessions().EndThisSessionAsync(user.Id, CancellationToken.None);

        Assert.Equal(1, _cookie.SignOuts);
        Assert.NotEqual(stamp, user.SecurityStamp);
    }

    [Fact]
    public async Task Ending_this_session_without_a_known_account_still_signs_the_cookie_out()
    {
        await Sessions().EndThisSessionAsync(null, CancellationToken.None);
        await Sessions().EndThisSessionAsync(Guid.NewGuid(), CancellationToken.None);

        Assert.Equal(2, _cookie.SignOuts);
    }

    [Fact]
    public async Task Ending_the_other_sessions_rotates_the_stamp_clears_failed_attempts_keeps_this_cookie_and_tells_the_owner()
    {
        var user = await AccountAsync();
        user.AccessFailedCount = 3;
        var stamp = user.SecurityStamp;
        var email = new RecordingAccountEmail();

        await Sessions(email).EndOtherSessionsAsync(user, CancellationToken.None);

        Assert.NotEqual(stamp, user.SecurityStamp);
        Assert.Equal(0, user.AccessFailedCount);
        Assert.Equal(0, _cookie.SignOuts);
        Assert.Equal(["ana@example.com"], email.PasswordChanged);
    }

    [Fact]
    public async Task A_password_change_notice_that_cannot_be_delivered_does_not_fail_the_change()
    {
        var user = await AccountAsync();

        await Sessions(new RecordingAccountEmail(fail: true)).EndOtherSessionsAsync(user, CancellationToken.None);

        Assert.Equal(0, user.AccessFailedCount);
    }

    [Fact]
    public async Task Ending_every_session_of_a_deleted_account_evicts_the_account_exists_answer_signs_out_and_tells_the_former_owner()
    {
        var id = Guid.NewGuid();
        await _cache.GetOrCreateAsync(CacheEntries.AccountExists(id), _ => Task.FromResult(true));
        var email = new RecordingAccountEmail();

        await Sessions(email).EndEverySessionAsync(id, "ana@example.com", CancellationToken.None);

        Assert.Equal(0, _cache.Entries);
        Assert.Equal(1, _cookie.SignOuts);
        Assert.Equal(["ana@example.com"], email.AccountDeleted);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(" ")]
    public async Task No_deletion_notice_is_attempted_without_an_address(string? address)
    {
        var email = new RecordingAccountEmail();

        await Sessions(email).EndEverySessionAsync(Guid.NewGuid(), address, CancellationToken.None);

        Assert.Empty(email.AccountDeleted);
        Assert.Equal(1, _cookie.SignOuts);
    }

    [Fact]
    public async Task A_deletion_notice_that_cannot_be_delivered_is_only_logged()
    {
        var id = Guid.NewGuid();
        await _cache.GetOrCreateAsync(CacheEntries.AccountExists(id), _ => Task.FromResult(true));

        await Sessions(new RecordingAccountEmail(fail: true)).EndEverySessionAsync(id, "ana@example.com", CancellationToken.None);

        Assert.Equal(0, _cache.Entries);
        Assert.Equal(1, _cookie.SignOuts);
    }
}
