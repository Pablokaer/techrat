using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using TechRat.Application.Identity;

namespace TechRat.Tests.Integration;

/// <summary>Sign-in, sign-up and password reset hardening (ADR-0029): password rules and uniform answers.</summary>
[Collection(ApiCollection.Name)]
public class LoginSecurityApiTests(TechRatFactory api)
{
    private static async Task<HttpResponseMessage> RegisterAsync(HttpClient client, string username, string password, string? email = null, string? language = null)
    {
        if (language is not null) client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(language);
        return await client.PostAsJsonAsync("/api/v1/auth/register",
            new { email = email ?? $"{username}@example.com", password, username, displayName = "Security Test" });
    }

    private static string Username(string prefix) => $"{prefix}_{Guid.NewGuid():N}"[..20];

    private static async Task<List<string?>> PasswordErrorsAsync(HttpResponseMessage res)
    {
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        return errors.GetProperty("password").EnumerateArray().Select(e => e.GetString()).ToList();
    }

    [Theory]
    [InlineData("Password1")]
    [InlineData("Qwerty123")]
    [InlineData("Welcome2024")]
    public async Task Sign_up_refuses_passwords_everybody_tries_first(string password)
    {
        var messages = await PasswordErrorsAsync(await RegisterAsync(api.CreateClient(), Username("weak"), password));

        Assert.Contains(messages, m => m!.Contains("too common", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Sign_up_refuses_a_password_built_from_the_username()
    {
        var username = Username("zebra");
        var messages = await PasswordErrorsAsync(await RegisterAsync(api.CreateClient(), username, $"{username}-9Xy"));

        Assert.Contains(messages, m => m!.Contains("cannot contain your username", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Sign_up_refuses_an_endless_password_instead_of_hashing_it()
    {
        var messages = await PasswordErrorsAsync(await RegisterAsync(api.CreateClient(), Username("long"), "Aa1-" + new string('x', AuthPolicy.MaxPasswordLength)));

        Assert.Contains(messages, m => m!.Contains($"at most {AuthPolicy.MaxPasswordLength} characters", StringComparison.Ordinal));
    }

    [Fact]
    public async Task The_password_rules_speak_portuguese_to_portuguese_clients()
    {
        var messages = await PasswordErrorsAsync(await RegisterAsync(api.CreateClient(), Username("ptweak"), "Password1", language: "pt-BR"));

        Assert.Contains(messages, m => m!.Contains("comum demais", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Changing_the_password_to_a_common_one_is_refused_and_the_old_one_keeps_working()
    {
        var (client, username) = await api.CreateUserAsync("chg");

        var res = await client.PostAsJsonAsync("/api/v1/auth/change-password", new { currentPassword = "Passw0rdX", newPassword = "Summer2025" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").GetProperty("newPassword");
        Assert.Contains(errors.EnumerateArray(), e => e.GetString()!.Contains("too common", StringComparison.Ordinal));
        var login = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new { email = $"{username}@example.com", password = "Passw0rdX" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task An_unknown_email_and_a_wrong_password_get_the_same_answer()
    {
        var (_, username) = await api.CreateUserAsync("same");

        var unknown = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new { email = "nobody-here@example.com", password = "Wr0ngPassword" });
        var wrong = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new { email = $"{username}@example.com", password = "Wr0ngPassword" });

        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        Assert.Equal(wrong.StatusCode, unknown.StatusCode);
        var a = await unknown.Content.ReadFromJsonAsync<JsonElement>();
        var b = await wrong.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(b.GetProperty("detail").GetString(), a.GetProperty("detail").GetString());
        Assert.Equal(b.GetProperty("title").GetString(), a.GetProperty("title").GetString());
    }

    [Fact]
    public async Task An_enormous_password_is_turned_away_without_being_hashed()
    {
        var res = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new { email = TechRatFactory.AdminEmail, password = new string('x', 5000) });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Resetting_with_a_missing_piece_is_a_validation_error_never_a_server_error()
    {
        var client = api.CreateClient();
        var noPassword = await client.PostAsJsonAsync("/api/v1/auth/reset-password", new { email = TechRatFactory.AdminEmail, resetCode = "abc" });
        var noCode = await client.PostAsJsonAsync("/api/v1/auth/reset-password", new { email = TechRatFactory.AdminEmail, newPassword = "Passw0rdY" });
        var hugeCode = await client.PostAsJsonAsync("/api/v1/auth/reset-password", new { email = TechRatFactory.AdminEmail, resetCode = new string('A', 5000), newPassword = "Passw0rdY" });
        var nothing = await client.PostAsJsonAsync("/api/v1/auth/reset-password", new { });

        Assert.Equal(HttpStatusCode.BadRequest, noPassword.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, noCode.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, hugeCode.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, nothing.StatusCode);
        var body = await noCode.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("resetCode", out _));
    }

    [Fact]
    public async Task A_missing_code_answers_like_a_wrong_code_for_known_and_unknown_accounts()
    {
        var known = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/reset-password", new { email = TechRatFactory.AdminEmail, newPassword = "Passw0rdY" });
        var unknown = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/reset-password", new { email = "nobody@example.com", newPassword = "Passw0rdY" });

        Assert.Equal(await known.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Forgot_password_answers_alike_for_unknown_addresses_blank_ones_and_absurdly_long_ones()
    {
        var client = api.CreateClient();
        foreach (var email in new[] { "nobody@example.com", "", "   ", new string('a', 400) + "@example.com" })
            Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { email })).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { })).StatusCode);
    }
}
