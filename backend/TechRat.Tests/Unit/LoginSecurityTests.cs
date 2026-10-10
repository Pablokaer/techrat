using System.Globalization;
using Microsoft.AspNetCore.Identity;
using TechRat.Application.Common;
using TechRat.Application.Identity;

namespace TechRat.Tests.Unit;

/// <summary>Password rules beyond Identity's length and character classes (ADR-0029).</summary>
public class PasswordPolicyTests
{
    private static readonly PasswordPolicyValidator Validator = new();

    private static async Task<IdentityResult> Check(string password, string userName = "learner42", string email = "learner42@example.com") =>
        await Validator.ValidateAsync(null!, new ApplicationUser { UserName = userName, Email = email }, password);

    [Theory]
    [InlineData("Password1")]
    [InlineData("password123")]
    [InlineData("PASSWORD!1")]
    [InlineData("Qwerty123")]
    [InlineData("Welcome1!")]
    [InlineData("Summer2024")]
    [InlineData("Admin12345")]
    [InlineData("Techrat1")]
    [InlineData("Senha123")]
    [InlineData("P@ssw0rd")]
    [InlineData("Passw0rd1")]
    public async Task Very_common_passwords_are_refused_even_with_digits_or_symbols_added(string password)
    {
        var result = await Check(password);

        var error = Assert.Single(result.Errors);
        Assert.Equal("PasswordTooCommon", error.Code);
    }

    [Theory]
    [InlineData("Passw0rdX")]
    [InlineData("N3wPassword")]
    [InlineData("Wr0ngPassword")]
    [InlineData("AdminPassw0rd")]
    [InlineData("Correct-Horse-Battery-9")]
    [InlineData("tr0ub4dor&3Staple")]
    public async Task Other_passwords_are_accepted(string password)
    {
        Assert.True((await Check(password)).Succeeded);
    }

    [Fact]
    public async Task A_password_may_not_contain_the_username()
    {
        var result = await Check("MyAlexander9x", userName: "alexander");

        Assert.Equal("PasswordContainsIdentity", Assert.Single(result.Errors).Code);
    }

    [Fact]
    public async Task A_password_may_not_contain_the_part_of_the_email_before_the_at_sign()
    {
        var result = await Check("Jordan.Smith7!", userName: "js_99", email: "jordan.smith@example.com");

        Assert.Equal("PasswordContainsIdentity", Assert.Single(result.Errors).Code);
    }

    [Fact]
    public async Task Short_names_are_not_matched_so_ordinary_passwords_are_not_refused_by_accident()
    {
        Assert.True((await Check("Bo1d-Climber-77", userName: "bo", email: "bo@example.com")).Succeeded);
        Assert.True((await Check("Example-Blue-Sky-5", userName: "learner42", email: "learner42@example.com")).Succeeded);
    }

    [Fact]
    public async Task The_domain_of_the_email_is_not_part_of_the_check()
    {
        Assert.True((await Check("Zebra-example-4Life", email: "learner42@example.com")).Succeeded);
    }

    [Fact]
    public async Task Passwords_up_to_the_limit_are_accepted_and_longer_ones_are_refused()
    {
        var atLimit = "Aa1-" + new string('x', AuthPolicy.MaxPasswordLength - 4);
        Assert.Equal(AuthPolicy.MaxPasswordLength, atLimit.Length);
        Assert.True((await Check(atLimit)).Succeeded);

        var result = await Check(atLimit + "y");
        Assert.Equal("PasswordTooLong", Assert.Single(result.Errors).Code);
    }

    [Fact]
    public async Task Every_error_code_mentions_Password_so_the_sign_up_form_shows_it_on_the_password_field()
    {
        foreach (var password in new[] { "Password1", new string('a', AuthPolicy.MaxPasswordLength + 1), "learner42-Xyz9" })
            Assert.All((await Check(password)).Errors, e => Assert.Contains("Password", e.Code));
    }

    [Fact]
    public async Task Errors_are_written_in_the_language_of_the_request()
    {
        var previous = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentUICulture = new CultureInfo("en");
            var en = (await Check("Password1")).Errors.Single().Description;
            CultureInfo.CurrentUICulture = new CultureInfo("pt-BR");
            var pt = (await Check("Password1")).Errors.Single().Description;

            Assert.NotEqual(en, pt);
            Assert.Contains("senha", pt, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            CultureInfo.CurrentUICulture = previous;
        }
    }
}

/// <summary>The numbers that decide how hard an attacker has to work; changing one should be a deliberate decision.</summary>
public class AuthPolicyTests
{
    [Fact]
    public void A_password_reset_link_is_short_lived()
    {
        Assert.True(AuthPolicy.PasswordResetTokenLifetime <= TimeSpan.FromHours(1));
        Assert.True(AuthPolicy.PasswordResetTokenLifetime >= TimeSpan.FromMinutes(15), "long enough to read the email and act");
    }

    [Fact]
    public void Lockout_slows_guessing_to_a_few_hundred_attempts_a_day_per_account()
    {
        var attemptsPerDay = AuthPolicy.MaxFailedAccessAttempts * (TimeSpan.FromDays(1) / AuthPolicy.LockoutDuration);
        Assert.True(attemptsPerDay <= 1000, $"{attemptsPerDay:0} guesses a day per account is too many");
        Assert.True(AuthPolicy.MaxFailedAccessAttempts >= 5, "a legitimate user mistypes a few times");
    }

    [Fact]
    public void Passwords_may_be_long_enough_for_passphrases_but_not_unbounded()
    {
        Assert.InRange(AuthPolicy.MaxPasswordLength, 64, 256);
        Assert.True(AuthPolicy.MinPasswordLength >= 8);
    }

    [Fact]
    public void Access_tokens_are_short_lived_compared_with_refresh_tokens()
    {
        Assert.True(AuthPolicy.AccessTokenLifetime <= TimeSpan.FromMinutes(30));
        Assert.True(AuthPolicy.RefreshTokenLifetime > AuthPolicy.AccessTokenLifetime);
    }
}

/// <summary>An unknown email must cost the same time as a known one, otherwise the login form tells attackers which accounts exist.</summary>
public class AuthTimingTests
{
    private sealed class CountingHasher : IPasswordHasher<ApplicationUser>
    {
        public int Hashes { get; private set; }
        public int Verifications { get; private set; }
        public string HashPassword(ApplicationUser user, string password) { Hashes++; return "hash:" + password; }
        public PasswordVerificationResult VerifyHashedPassword(ApplicationUser user, string hashedPassword, string providedPassword)
        {
            Verifications++;
            return PasswordVerificationResult.Failed;
        }
    }

    [Fact]
    public void An_unknown_account_still_pays_for_one_password_verification()
    {
        var hasher = new CountingHasher();

        AuthTiming.BurnPasswordCheck(hasher, "whatever-was-typed");

        Assert.Equal(1, hasher.Verifications);
    }

    [Fact]
    public void The_reference_hash_is_created_once_per_hasher_and_reused()
    {
        var hasher = new CountingHasher();

        AuthTiming.BurnPasswordCheck(hasher, "a");
        AuthTiming.BurnPasswordCheck(hasher, "b");
        AuthTiming.BurnPasswordCheck(hasher, null);

        Assert.Equal(1, hasher.Hashes);
        Assert.Equal(3, hasher.Verifications);
    }

    [Fact]
    public void It_never_reports_success_whatever_is_typed()
    {
        Assert.False(AuthTiming.BurnPasswordCheck(new PasswordHasher<ApplicationUser>(), "anything at all"));
        Assert.False(AuthTiming.BurnPasswordCheck(new PasswordHasher<ApplicationUser>(), null));
    }
}

/// <summary>Reset emails are sent at most once a minute per address, so the form cannot be used to flood someone's inbox.</summary>
public class ResetEmailThrottleTests
{
    private sealed class DictionaryCache : ICacheService
    {
        public List<string> Keys { get; } = [];
        private readonly Dictionary<string, object> _values = [];
        public Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default)
        {
            Keys.Add(key);
            if (_values.TryGetValue(key, out var existing)) return Task.FromResult((T)existing);
            return Create();
            async Task<T> Create() { var v = await factory(ct); _values[key] = v!; return v; }
        }
        public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) => Task.FromResult(_values.TryGetValue(key, out var v) ? (T?)v : default);
        public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default) { _values[key] = value!; return Task.CompletedTask; }
        public Task RemoveAsync(string key, CancellationToken ct = default) { _values.Remove(key); return Task.CompletedTask; }
    }

    [Fact]
    public async Task The_first_request_for_an_address_is_allowed_and_a_repeat_inside_the_window_is_not()
    {
        var throttle = new ResetEmailThrottle(new DictionaryCache());

        Assert.True(await throttle.TryAcquireAsync("ana@example.com", CancellationToken.None));
        Assert.False(await throttle.TryAcquireAsync("ana@example.com", CancellationToken.None));
        Assert.False(await throttle.TryAcquireAsync("ana@example.com", CancellationToken.None));
    }

    [Fact]
    public async Task Spelling_does_not_get_around_the_window()
    {
        var throttle = new ResetEmailThrottle(new DictionaryCache());

        Assert.True(await throttle.TryAcquireAsync("Ana@Example.com", CancellationToken.None));
        Assert.False(await throttle.TryAcquireAsync("  ana@example.COM ", CancellationToken.None));
    }

    [Fact]
    public async Task Each_address_has_its_own_window()
    {
        var throttle = new ResetEmailThrottle(new DictionaryCache());

        Assert.True(await throttle.TryAcquireAsync("ana@example.com", CancellationToken.None));
        Assert.True(await throttle.TryAcquireAsync("bia@example.com", CancellationToken.None));
    }

    [Fact]
    public async Task The_cache_key_never_contains_the_address_itself()
    {
        var cache = new DictionaryCache();

        await new ResetEmailThrottle(cache).TryAcquireAsync("ana@example.com", CancellationToken.None);

        Assert.DoesNotContain("ana", Assert.Single(cache.Keys));
        Assert.DoesNotContain("example", cache.Keys[0]);
    }

    [Fact]
    public async Task A_cache_that_fails_never_blocks_a_legitimate_reset()
    {
        // DistributedCacheService turns outages into a normal miss; the throttle then simply allows the email.
        var throttle = new ResetEmailThrottle(new FailingCache());

        Assert.True(await throttle.TryAcquireAsync("ana@example.com", CancellationToken.None));
    }

    private sealed class FailingCache : ICacheService
    {
        public async Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default) =>
            await factory(ct);
        public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) => Task.FromResult<T?>(default);
        public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default) => Task.CompletedTask;
        public Task RemoveAsync(string key, CancellationToken ct = default) => Task.CompletedTask;
    }
}
