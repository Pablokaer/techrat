using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
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
    public void Map(RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth").WithTags("Identity");

        auth.MapPost("/register", RegisterAsync).RequireRateLimiting("auth")
            .WithSummary("Create an account with email and password");

        auth.MapPost("/login", LoginAsync).RequireRateLimiting("auth")
            .WithSummary("Sign in. Web uses useCookies=true (HttpOnly cookie); mobile/desktop receive bearer + refresh tokens");

        auth.MapPost("/refresh", RefreshAsync).RequireRateLimiting("auth")
            .WithSummary("Exchange a refresh token for a new access token");

        auth.MapPost("/logout", LogoutAsync).RequireAuthorization()
            .WithSummary("Sign out (clears the cookie and invalidates refresh tokens)");

        auth.MapPost("/forgot-password", ForgotPasswordAsync).RequireRateLimiting("auth")
            .WithSummary("Send a password reset email. Always returns 202 to avoid account enumeration");

        auth.MapPost("/reset-password", ResetPasswordAsync).RequireRateLimiting("auth")
            .WithSummary("Reset the password using the code from the email");

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
        var account = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        if (account is null)
            return TypedResults.Problem(Text.Get(Text.Keys.InvalidCredentials), statusCode: StatusCodes.Status401Unauthorized);

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

    private static async Task<Accepted> ForgotPasswordAsync(
        ForgotPasswordRequest request, UserManager<ApplicationUser> users, IEmailSender<ApplicationUser> email, IConfiguration config)
    {
        var user = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        if (user is not null)
        {
            var code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(await users.GeneratePasswordResetTokenAsync(user)));
            var baseUrl = (config["App:PublicWebUrl"] ?? "http://localhost:3000").TrimEnd('/');
            var link = $"{baseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&code={Uri.EscapeDataString(code)}";
            await email.SendPasswordResetLinkAsync(user, user.Email!, link);
        }
        return TypedResults.Accepted((string?)null);
    }

    private static async Task<Results<NoContent, ValidationProblem>> ResetPasswordAsync(ResetPasswordRequest request, UserManager<ApplicationUser> users)
    {
        var user = string.IsNullOrWhiteSpace(request.Email) ? null : await users.FindByEmailAsync(request.Email.Trim());
        IdentityResult result;
        if (user is null)
        {
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
