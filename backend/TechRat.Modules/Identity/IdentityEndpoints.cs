using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Application.Identity;
using TechRat.Application.Users;
using TechRat.Domain.Users;
using TechRat.Modules.Common;

namespace TechRat.Modules.Identity;

public sealed record RegisterRequest(string Email, string Password, string Username, string? DisplayName);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshRequest(string RefreshToken);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Email, string ResetCode, string NewPassword);
/// <param name="CurrentPassword">Required when the account has a password; omitted to set the first one (external sign-in).</param>
public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);
/// <param name="Password">Required when the account has a password.</param>
/// <param name="Confirmation">Required when it has none (external sign-in): the account's own username, typed by the owner.</param>
public sealed record DeleteAccountRequest(string? Password, string? Confirmation);
/// <param name="HasPassword">False for accounts created through an external provider: clients offer "set a password".</param>
public sealed record PasswordStatusDto(bool HasPassword);
public sealed record AuthProviderDto(string Name, string DisplayName, bool Enabled, bool Featured);

public static partial class AuthValidation
{
    [GeneratedRegex("^[a-z0-9_]{3,32}$")]
    public static partial Regex UsernameRx();

    public static void Validate(RegisterRequest r)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(r.Email) || r.Email.Length > 256 || !new EmailAddressAttribute().IsValid(r.Email))
            errors["email"] = [Text.Get(Text.Keys.EmailInvalid)];
        if (string.IsNullOrWhiteSpace(r.Username) || !UsernameRx().IsMatch(r.Username.ToLowerInvariant()))
            errors["username"] = [Text.Get(Text.Keys.UsernameInvalid)];
        if (r.DisplayName is { } dn && dn.Trim().Length is < 2 or > 40)
            errors["displayName"] = [Text.Get(Text.Keys.DisplayNameLength)];
        if (string.IsNullOrEmpty(r.Password))
            errors["password"] = [Text.Get(Text.Keys.PasswordRequired)];
        if (errors.Count > 0) throw new RequestValidationException(errors);
    }
}

public sealed class IdentityEndpoints : IEndpointModule
{
    /// <summary>Generous on purpose: accounts created before the password length limit may have longer passwords.</summary>
    private const int MaxLoginPasswordLength = 1024;

    private const int MaxResetCodeLength = 2048;

    public void Map(RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth").WithTags("Identity");

        auth.MapPost("/register", RegisterAsync).RequireRateLimiting("auth")
            .WithSummary("Create an account with email and password")
            .WithDescription("The password has 8 to 128 characters with an uppercase letter, a lowercase letter and a digit, is not a very " +
                             "common password (\"Password1\", \"Summer2024!\") and does not contain the username or the part of the email before the @.");

        auth.MapPost("/login", LoginAsync).RequireRateLimiting("auth")
            .WithSummary("Sign in. Web uses useCookies=true (HttpOnly cookie); mobile/desktop receive bearer + refresh tokens");

        auth.MapPost("/refresh", RefreshAsync).RequireRateLimiting("auth")
            .WithSummary("Exchange a refresh token for a new access token");

        auth.MapPost("/logout", LogoutAsync).RequireAuthorization()
            .WithSummary("Sign out (clears the cookie and invalidates refresh tokens)");

        auth.MapPost("/forgot-password", ForgotPasswordAsync).RequireRateLimiting("auth")
            .WithSummary("Send a password reset email. Always returns 202 to avoid account enumeration")
            .WithDescription("Answers 202 after the same work for every address, known or not; the email is sent afterwards, at most once a minute " +
                             "per address. The link in it works for one hour.");

        auth.MapPost("/reset-password", ResetPasswordAsync).RequireRateLimiting("auth")
            .WithSummary("Reset the password using the code from the email")
            .WithDescription("The code expires one hour after the email was sent. The new password follows the sign-up rules. A missing or wrong " +
                             "field answers 400 in the same shape for known and unknown accounts.");

        auth.MapGet("/password", async (UserManager<ApplicationUser> users, ICurrentUser current) =>
            TypedResults.Ok(new PasswordStatusDto(await users.HasPasswordAsync(await RequireAccountAsync(users, current)))))
            .RequireAuthorization()
            .WithSummary("Whether the signed-in account has a password (change it) or not (set one)");

        auth.MapPost("/change-password", ChangePasswordAsync).RequireAuthorization().RequireRateLimiting("auth")
            .Produces<AccessTokenResponse>(StatusCodes.Status200OK)
            .WithSummary("Change (or set) the password of the signed-in account")
            .WithDescription("Checks the current password on the server (failures count towards lockout) and applies the sign-up rules. " +
                             "Every other session is signed out. The calling session continues: a cookie session gets a renewed cookie " +
                             "(204), a bearer session gets new tokens (200). The owner is emailed.");

        var account = api.MapGroup("/account").WithTags("Identity");

        account.MapDelete("", DeleteAccountAsync).RequireAuthorization().RequireRateLimiting("auth")
            .Produces(StatusCodes.Status204NoContent)
            .WithSummary("Permanently delete the signed-in account and its data")
            .WithDescription("Requires the current password (failures count towards lockout) or, for accounts without a password, " +
                             "the username typed as confirmation. Deletes the credentials, profile, photo, progress, XP, achievements, " +
                             "notifications and every session; all tokens stop working at once and the owner is emailed. The last " +
                             "administrator cannot delete the account (409). This cannot be undone.");

        auth.MapGet("/providers", (IConfiguration config) =>
        {
            // OAuth is prepared but not enabled in the MVP. GitHub is featured because the audience is developers.
            bool On(string name) => !string.IsNullOrWhiteSpace(config[$"Authentication:{name}:ClientId"]);
            return TypedResults.Ok(new List<AuthProviderDto>
            {
                new("github", "GitHub", On("GitHub"), true),
                new("google", "Google", On("Google"), false),
                new("microsoft", "Microsoft", On("Microsoft"), false),
                new("apple", "Apple", On("Apple"), false),
            });
        }).WithSummary("External login providers and whether they are enabled");
    }

    private static async Task<Created<UserSummaryDto>> RegisterAsync(
        RegisterRequest request, UserManager<ApplicationUser> users, IAppDbContext db, ProfileService profiles,
        TimeProvider clock, ILoggerFactory loggers, CancellationToken ct)
    {
        AuthValidation.Validate(request);
        var username = request.Username.ToLowerInvariant();
        var email = request.Email.Trim();

        if (await users.FindByNameAsync(username) is not null)
            throw RequestValidationException.For("username", Text.Get(Text.Keys.UsernameTaken));
        if (await users.FindByEmailAsync(email) is not null)
            throw RequestValidationException.For("email", Text.Get(Text.Keys.EmailTaken));

        await using var tx = await db.BeginTransactionAsync(ct);
        var account = new ApplicationUser { Id = Guid.CreateVersion7(), UserName = username, Email = email };
        var result = await users.CreateAsync(account, request.Password);
        if (!result.Succeeded)
            throw new RequestValidationException(result.Errors
                .GroupBy(e => e.Code.Contains("Password", StringComparison.Ordinal) ? "password" : e.Code.Contains("Email", StringComparison.Ordinal) ? "email" : "username")
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()));

        db.UserProfiles.Add(new User
        {
            Id = account.Id,
            Username = username,
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? request.Username : request.DisplayName.Trim(),
            Email = email,
            CreatedAt = clock.GetUtcNow(),
        });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        loggers.CreateLogger("Identity").LogInformation("User registered {UserId}", account.Id);

        return TypedResults.Created("/api/v1/users/me", await profiles.GetSummaryAsync(account.Id, false, ct));
    }

    private static async Task<Results<Ok<AccessTokenResponse>, EmptyHttpResult, ProblemHttpResult>> LoginAsync(
        LoginRequest request, bool? useCookies, SignInManager<ApplicationUser> signIn, UserManager<ApplicationUser> users,
        IAppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        // Nobody's password is this long (sign-up stops at AuthPolicy.MaxPasswordLength), so don't spend time hashing it.
        if (request.Password is { Length: > MaxLoginPasswordLength })
            return TypedResults.Problem(Text.Get(Text.Keys.InvalidCredentials), statusCode: StatusCodes.Status401Unauthorized);

        var account = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        if (account is null)
        {
            // An unknown email must take as long as a wrong password, or the response time tells which emails are registered.
            AuthTiming.BurnPasswordCheck(users.PasswordHasher, request.Password);
            return TypedResults.Problem(Text.Get(Text.Keys.InvalidCredentials), statusCode: StatusCodes.Status401Unauthorized);
        }

        signIn.AuthenticationScheme = useCookies == true ? IdentityConstants.ApplicationScheme : IdentityConstants.BearerScheme;
        var result = await signIn.PasswordSignInAsync(account.UserName!, request.Password ?? "", isPersistent: useCookies == true, lockoutOnFailure: true);
        if (!result.Succeeded)
            return TypedResults.Problem(Text.Get(result.IsLockedOut ? Text.Keys.LockedOut : Text.Keys.InvalidCredentials),
                statusCode: StatusCodes.Status401Unauthorized);

        var profile = await db.UserProfiles.FindAsync([account.Id], ct);
        if (profile is not null)
        {
            profile.LastLoginAt = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
        }
        // The sign-in handler already wrote the bearer token response or the cookie.
        return TypedResults.Empty;
    }

    private static async Task<Results<SignInHttpResult, ChallengeHttpResult>> RefreshAsync(
        RefreshRequest request, SignInManager<ApplicationUser> signIn, IOptionsMonitor<BearerTokenOptions> bearerOptions, TimeProvider clock)
    {
        var protector = bearerOptions.Get(IdentityConstants.BearerScheme).RefreshTokenProtector;
        var ticket = protector.Unprotect(request.RefreshToken);
        if (ticket?.Properties?.ExpiresUtc is not { } expires || clock.GetUtcNow() >= expires ||
            await signIn.ValidateSecurityStampAsync(ticket.Principal) is not { } user)
            return TypedResults.Challenge();

        var principal = await signIn.CreateUserPrincipalAsync(user);
        return TypedResults.SignIn(principal, authenticationScheme: IdentityConstants.BearerScheme);
    }

    private static async Task<NoContent> LogoutAsync(SignInManager<ApplicationUser> signIn, UserManager<ApplicationUser> users, ICurrentUser current)
    {
        await signIn.SignOutAsync();
        // Rotating the security stamp invalidates outstanding refresh tokens (bearer clients).
        if (current.UserId is { } id && await users.FindByIdAsync(id.ToString()) is { } user)
            await users.UpdateSecurityStampAsync(user);
        return TypedResults.NoContent();
    }

    private static async Task<ApplicationUser> RequireAccountAsync(UserManager<ApplicationUser> users, ICurrentUser current) =>
        await users.FindByIdAsync(current.RequireUserId().ToString()) ?? throw new NotFoundException("User", current.RequireUserId());

    private static async Task<Results<NoContent, SignInHttpResult, ValidationProblem>> ChangePasswordAsync(
        ChangePasswordRequest request, HttpContext http, UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn,
        ICurrentUser current, IAccountEmailSender email, ILoggerFactory loggers, CancellationToken ct)
    {
        static ValidationProblem Invalid(string field, string key) =>
            TypedResults.ValidationProblem(new Dictionary<string, string[]> { [field] = [Text.Get(key)] });

        var user = await RequireAccountAsync(users, current);
        if (string.IsNullOrEmpty(request.NewPassword)) return Invalid("newPassword", Text.Keys.PasswordRequired);

        IdentityResult result;
        if (await users.HasPasswordAsync(user))
        {
            if (string.IsNullOrEmpty(request.CurrentPassword)) return Invalid("currentPassword", Text.Keys.CurrentPasswordRequired);
            if (await users.IsLockedOutAsync(user)) return Invalid("currentPassword", Text.Keys.LockedOut);
            if (!await users.CheckPasswordAsync(user, request.CurrentPassword))
            {
                // A stolen session must not be a way to guess the password: wrong guesses lock the account like logins do.
                await users.AccessFailedAsync(user);
                return Invalid("currentPassword", Text.Keys.CurrentPasswordIncorrect);
            }
            if (request.NewPassword == request.CurrentPassword) return Invalid("newPassword", Text.Keys.NewPasswordSameAsCurrent);
            result = await users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        }
        else
        {
            result = await users.AddPasswordAsync(user, request.NewPassword);
        }
        if (!result.Succeeded)
            return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["newPassword"] = [.. result.Errors.Select(e => e.Description)] });

        // Both calls rotated the security stamp: refresh tokens stop working and other cookies fail their next validation.
        await users.ResetAccessFailedCountAsync(user);
        var log = loggers.CreateLogger("TechRat.Identity");
        log.LogInformation("Password changed for user {UserId}", user.Id);
        try
        {
            await email.SendPasswordChangedAsync(user.Email!, ct);
        }
        catch (EmailDeliveryException)
        {
            log.LogWarning("Password change notice could not be delivered to user {UserId}", user.Id);
        }

        // Keep the session that made the change, following how it signed in.
        if (http.Request.Headers.Authorization.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return TypedResults.SignIn(await signIn.CreateUserPrincipalAsync(user), authenticationScheme: IdentityConstants.BearerScheme);
        await signIn.RefreshSignInAsync(user);
        return TypedResults.NoContent();
    }

    /// <summary>
    /// Deleting the account removes the Identity user; the learner profile and everything that hangs off it (attempts,
    /// sessions, XP, progress, achievements, notifications, photo) go with it through the database cascades, in one
    /// statement, so there is no half-deleted state. See ADR-0023.
    /// </summary>
    private static async Task<Results<NoContent, ValidationProblem, ProblemHttpResult>> DeleteAccountAsync(
        [FromBody] DeleteAccountRequest request, UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn, ICurrentUser current,
        ICacheService cache, IAccountEmailSender email, ILoggerFactory loggers, CancellationToken ct)
    {
        static ValidationProblem Invalid(string field, string key) =>
            TypedResults.ValidationProblem(new Dictionary<string, string[]> { [field] = [Text.Get(key)] });

        var user = await RequireAccountAsync(users, current);

        // Re-authenticate: a stolen session or an unlocked phone must not be enough to destroy an account.
        if (await users.HasPasswordAsync(user))
        {
            if (string.IsNullOrEmpty(request.Password)) return Invalid("password", Text.Keys.CurrentPasswordRequired);
            if (await users.IsLockedOutAsync(user)) return Invalid("password", Text.Keys.LockedOut);
            if (!await users.CheckPasswordAsync(user, request.Password))
            {
                // Same as changing the password: wrong guesses lock the account like failed logins do.
                await users.AccessFailedAsync(user);
                return Invalid("password", Text.Keys.CurrentPasswordIncorrect);
            }
        }
        else if (!string.Equals(request.Confirmation?.Trim(), user.UserName, StringComparison.OrdinalIgnoreCase))
        {
            // No password to prove (external sign-in): typing the username is a deliberate, explicit confirmation.
            return Invalid("confirmation", Text.Keys.AccountDeleteConfirmation);
        }

        // The platform must always have someone who can administer it.
        if (await users.IsInRoleAsync(user, Roles.Admin) && (await users.GetUsersInRoleAsync(Roles.Admin)).Count <= 1)
            return TypedResults.Problem(Text.Get(Text.Keys.AccountDeleteLastAdmin), statusCode: StatusCodes.Status409Conflict,
                title: Text.Get(Text.Keys.ProblemConflict));

        var address = user.Email;
        var id = user.Id;
        var deleted = await users.DeleteAsync(user);
        if (!deleted.Succeeded)
            throw new InvalidOperationException("Account deletion failed: " + string.Join("; ", deleted.Errors.Select(e => e.Code)));

        // Tokens: refresh tokens die with the user (their security stamp can no longer be validated); access tokens are
        // stateless, so evicting the cached "account exists" answer makes the next request of any device fail at once.
        await cache.RemoveAsync(CacheKeys.AccountExists(id), ct);
        await signIn.SignOutAsync();

        var log = loggers.CreateLogger("TechRat.Identity");
        log.LogInformation("Account deleted {UserId}", id);
        if (!string.IsNullOrWhiteSpace(address))
        {
            try
            {
                await email.SendAccountDeletedAsync(address, ct);
            }
            catch (EmailDeliveryException)
            {
                // The deletion already happened and cannot be undone: a lost notice is only logged (no address in the log).
                log.LogWarning("Account deletion notice could not be delivered for {UserId}", id);
            }
        }
        return TypedResults.NoContent();
    }

    /// <summary>
    /// Always answers 202 after the same work, whether the address belongs to an account or not. The token and the email
    /// are produced after the answer (SMTP takes far longer than the lookup, which would reveal the account), and at most
    /// one email per address per minute goes out so the form cannot flood an inbox. See ADR-0029.
    /// </summary>
    private static async Task<Accepted> ForgotPasswordAsync(
        ForgotPasswordRequest request, UserManager<ApplicationUser> users, ResetEmailThrottle throttle, IServiceScopeFactory scopes,
        ILoggerFactory loggers, CancellationToken ct)
    {
        var address = request.Email?.Trim();
        if (string.IsNullOrWhiteSpace(address) || address.Length > 256) return TypedResults.Accepted((string?)null);

        var user = await users.FindByEmailAsync(address);
        var mayEmail = await throttle.TryAcquireAsync(address, ct);
        if (user is not null && mayEmail)
        {
            var id = user.Id;
            var log = loggers.CreateLogger("TechRat.Identity");
            // The request's culture flows into the task, so the email is written in the language of the request.
            _ = Task.Run(() => SendResetEmailAsync(scopes, id, log), CancellationToken.None);
        }
        return TypedResults.Accepted((string?)null);
    }

    private static async Task SendResetEmailAsync(IServiceScopeFactory scopes, Guid userId, ILogger log)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var email = scope.ServiceProvider.GetRequiredService<IEmailSender<ApplicationUser>>();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            if (await users.FindByIdAsync(userId.ToString()) is not { Email: { } to } user) return;

            var code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(await users.GeneratePasswordResetTokenAsync(user)));
            var baseUrl = (config["App:PublicWebUrl"] ?? "http://localhost:3000").TrimEnd('/');
            var link = $"{baseUrl}/reset-password?email={Uri.EscapeDataString(to)}&code={Uri.EscapeDataString(code)}";
            await email.SendPasswordResetLinkAsync(user, to, link);
        }
        catch (EmailDeliveryException)
        {
            // Already logged by the sender; nobody is waiting for the answer, so there is nothing more to do.
            log.LogWarning("Password reset email could not be delivered");
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Password reset email failed for user {UserId}", userId);
        }
    }

    private static async Task<Results<NoContent, ValidationProblem>> ResetPasswordAsync(ResetPasswordRequest request, UserManager<ApplicationUser> users)
    {
        if (string.IsNullOrEmpty(request.NewPassword))
            return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["newPassword"] = [Text.Get(Text.Keys.PasswordRequired)] });

        var user = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        IdentityResult result;
        if (user is null || string.IsNullOrWhiteSpace(request.ResetCode) || request.ResetCode.Length > MaxResetCodeLength)
        {
            // Unknown account, or no usable code: the same answer as a wrong code, so nothing reveals which emails exist.
            result = IdentityResult.Failed(users.ErrorDescriber.InvalidToken());
        }
        else
        {
            try
            {
                var code = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.ResetCode));
                result = await users.ResetPasswordAsync(user, code, request.NewPassword);
            }
            catch (FormatException)
            {
                result = IdentityResult.Failed(users.ErrorDescriber.InvalidToken());
            }
        }
        if (result.Succeeded) return TypedResults.NoContent();
        return TypedResults.ValidationProblem(result.Errors.GroupBy(e => e.Code.Contains("Password") ? "newPassword" : "resetCode")
            .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()));
    }
}
