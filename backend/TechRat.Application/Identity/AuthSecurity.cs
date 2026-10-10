using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using TechRat.Application.Common;

namespace TechRat.Application.Identity;

/// <summary>
/// The numbers that decide how hard an attacker has to work to get into an account, in one place (ADR-0029). The unit
/// tests pin their relationships (for example "a few hundred guesses a day per account"), so a change is deliberate.
/// </summary>
public static class AuthPolicy
{
    public const int MinPasswordLength = 8;

    /// <summary>Long enough for passphrases, short enough that nobody can make the server hash megabytes.</summary>
    public const int MaxPasswordLength = 128;

    public const int MaxFailedAccessAttempts = 8;

    /// <summary>8 attempts per 15 minutes is about 770 guesses a day per account, however many addresses the attacker uses.</summary>
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    /// <summary>The emailed reset link stops working after an hour (Identity's default is a day).</summary>
    public static readonly TimeSpan PasswordResetTokenLifetime = TimeSpan.FromHours(1);

    /// <summary>The emailed link that confirms an address works for a day: people read their mail later than a reset link.</summary>
    public static readonly TimeSpan EmailConfirmationTokenLifetime = TimeSpan.FromHours(24);

    /// <summary>At most one reset email per account in this window, so the form cannot flood an inbox.</summary>
    public static readonly TimeSpan ResetEmailCooldown = TimeSpan.FromMinutes(1);

    public static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(14);
}

/// <summary>
/// Password rules on top of Identity's length and character classes: not a password everybody tries first (with digits
/// or symbols appended or letters swapped for look-alikes), not built from the account's own username or email, and not
/// absurdly long. Complexity rules alone accept "Password1"; this is what actually blocks guessable passwords (NIST SP 800-63B).
/// </summary>
public sealed class PasswordPolicyValidator : IPasswordValidator<ApplicationUser>
{
    private const int MinNameLengthToMatch = 3;
    private const int MinEmailNameLengthToMatch = 4;

    public Task<IdentityResult> ValidateAsync(UserManager<ApplicationUser> manager, ApplicationUser user, string? password)
    {
        if (string.IsNullOrEmpty(password)) return Task.FromResult(IdentityResult.Success);
        if (password.Length > AuthPolicy.MaxPasswordLength)
            return Task.FromResult(Fail("PasswordTooLong", Text.Keys.PasswordTooLong, AuthPolicy.MaxPasswordLength));

        var errors = new List<IdentityError>();
        if (IsCommon(password)) errors.Add(Error("PasswordTooCommon", Text.Keys.PasswordTooCommon));
        if (ContainsIdentity(password, user)) errors.Add(Error("PasswordContainsIdentity", Text.Keys.PasswordContainsIdentity));
        return Task.FromResult(errors.Count == 0 ? IdentityResult.Success : IdentityResult.Failed([.. errors]));
    }

    private static IdentityError Error(string code, string key, params object[] args) => new() { Code = code, Description = Text.Get(key, args) };
    private static IdentityResult Fail(string code, string key, params object[] args) => IdentityResult.Failed(Error(code, key, args));

    /// <summary>Lower-cases, drops the digits and symbols people append ("Summer2024!"), then undoes look-alike swaps ("p@ssw0rd").</summary>
    internal static bool IsCommon(string password)
    {
        var lower = password.ToLowerInvariant();
        var end = lower.Length;
        while (end > 0 && !char.IsLetter(lower[end - 1])) end--;
        var baseWord = lower[..end];
        return CommonPasswords.Contains(Unleet(baseWord)) || CommonPasswords.Contains(Unleet(lower));
    }

    private static string Unleet(string s) => string.Create(s.Length, s, static (span, source) =>
    {
        for (var i = 0; i < source.Length; i++)
            span[i] = source[i] switch
            {
                '0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '@' => 'a', '$' => 's', '!' => 'i',
                var c => c,
            };
    });

    private static bool ContainsIdentity(string password, ApplicationUser user)
    {
        var lower = password.ToLowerInvariant();
        if (user.UserName is { Length: >= MinNameLengthToMatch } name && lower.Contains(name.ToLowerInvariant(), StringComparison.Ordinal)) return true;
        var local = user.Email?.Split('@')[0];
        return local is { Length: >= MinEmailNameLengthToMatch } && lower.Contains(local.ToLowerInvariant(), StringComparison.Ordinal);
    }

    /// <summary>Words and names that top every leaked-password list, in English and Portuguese, as the letters-only base.</summary>
    private static readonly HashSet<string> CommonPasswords = new(StringComparer.Ordinal)
    {
        "password", "passwd", "pass", "senha", "senhas", "secret", "segredo", "letmein", "welcome", "bemvindo", "login", "logon", "signin",
        "admin", "administrator", "administrador", "root", "user", "usuario", "guest", "convidado", "test", "testing", "teste", "demo", "default",
        "changeme", "mudar", "mudarsenha", "trocar", "techrat", "tech", "dev", "developer", "program", "programador", "coder", "hacker",
        "qwerty", "qwertyuiop", "qwertz", "azerty", "asdf", "asdfg", "asdfgh", "asdfghjk", "asdfghjkl", "zxcv", "zxcvb", "zxcvbn", "zxcvbnm",
        "abc", "abcd", "abcde", "abcdef", "abcdefg", "abcdefgh", "aaaaaa", "aaaaaaaa", "iloveyou", "teamo", "loveyou", "amor", "love", "lovely",
        "monkey", "dragon", "master", "shadow", "sunshine", "princess", "princesa", "football", "futebol", "baseball", "soccer", "basketball",
        "flamengo", "corinthians", "palmeiras", "santos", "gremio", "vasco", "brasil", "brazil", "superman", "batman", "spiderman", "starwars",
        "naruto", "pokemon", "minecraft", "fortnite", "hello", "hunter", "freedom", "liberdade", "whatever", "computer", "computador",
        "internet", "service", "servico", "system", "sistema", "company", "empresa", "access", "flower", "cheese", "chocolate", "cookie",
        "michael", "jordan", "jennifer", "thomas", "robert", "daniel", "joshua", "andrew", "ashley", "nicole", "jessica", "matthew", "mustang",
        "harley", "ranger", "buster", "tigger", "charlie", "maggie", "summer", "winter", "spring", "autumn", "verao", "inverno", "primavera",
        "outono", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
        "janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
        "monday", "friday", "sunday", "segunda", "sexta", "domingo", "trustno", "trustnoone", "nopassword", "passw", "p455w0rd",
    };
}

/// <summary>
/// An unknown email must cost as much time as a known one. Without it the login form answers instantly for accounts that
/// do not exist and only after hashing the password for accounts that do, which tells an attacker which emails are registered.
/// </summary>
public static class AuthTiming
{
    // The reference hash depends on the hasher's cost settings, so it is created once per hasher instance and reused.
    private static readonly ConditionalWeakTable<IPasswordHasher<ApplicationUser>, string> ReferenceHashes = new();
    private static readonly ApplicationUser Nobody = new() { UserName = "nobody", Email = "nobody@invalid" };

    /// <summary>
    /// Does the work of hashing a new password and discards it. Sign-up uses it when the email already has an account, so
    /// that answering "accepted" costs as much as creating one and the response time does not reveal the difference.
    /// </summary>
    public static void BurnPasswordHash(IPasswordHasher<ApplicationUser> hasher, string password) =>
        _ = hasher.HashPassword(Nobody, password);

    /// <summary>Does the work of checking a password against a stored hash and always returns false.</summary>
    public static bool BurnPasswordCheck(IPasswordHasher<ApplicationUser> hasher, string? typed)
    {
        var reference = ReferenceHashes.GetValue(hasher, static h => h.HashPassword(Nobody, Convert.ToBase64String(RandomNumberGenerator.GetBytes(24))));
        _ = hasher.VerifyHashedPassword(Nobody, reference, typed ?? "");
        return false;
    }
}

/// <summary>
/// Allows one email of each kind (reset, confirmation, "already registered") per address per
/// <see cref="AuthPolicy.ResetEmailCooldown"/>. It is keyed by the address
/// (hashed, so the cache never holds it) and asked for known and unknown addresses alike, so it adds no timing difference.
/// </summary>
public sealed class ResetEmailThrottle(ICacheService cache)
{
    /// <summary>True when an email may be sent now. A cache outage reads as "not seen yet", so a real reset is never blocked by it.</summary>
    public async Task<bool> TryAcquireAsync(string email, CancellationToken ct, string purpose = "reset")
    {
        var key = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(email.Trim().ToUpperInvariant())));
        var first = false;
        await cache.GetOrCreateAsync($"auth:{purpose}-email:{key}", AuthPolicy.ResetEmailCooldown, _ =>
        {
            first = true;
            return Task.FromResult(true);
        }, ct);
        return first;
    }
}
