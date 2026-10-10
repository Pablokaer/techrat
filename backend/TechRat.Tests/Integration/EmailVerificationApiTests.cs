using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace TechRat.Tests.Integration;

/// <summary>
/// Sign-up needs a confirmed email, and answers the same whether or not the address already has an account, so the form
/// cannot be used to find out who is registered (ADR-0031).
/// </summary>
[Collection(ApiCollection.Name)]
public class EmailVerificationApiTests(TechRatFactory api)
{
    private const string Password = "Passw0rdX";

    private static string Username(string prefix) => $"{prefix}_{Guid.NewGuid():N}"[..20];

    private static Task<HttpResponseMessage> Register(HttpClient client, string username, string email, string password = Password) =>
        client.PostAsJsonAsync("/api/v1/auth/register", new { email, password, username, displayName = "Verify" });

    private static Task<HttpResponseMessage> Login(HttpClient client, string email, string password = Password, bool cookies = false) =>
        client.PostAsJsonAsync($"/api/v1/auth/login{(cookies ? "?useCookies=true" : "")}", new { email, password });

    private static async Task<string> ErrorsOf(HttpResponseMessage res)
    {
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").GetRawText();
    }

    [Fact]
    public async Task Sign_up_is_accepted_and_the_account_cannot_sign_in_until_the_email_is_confirmed()
    {
        var client = api.CreateClient();
        var username = Username("conf");
        var email = $"{username}@example.com";

        var res = await Register(client, username, email);

        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
        Assert.True((await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("confirmationRequired").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, (await Login(client, email)).StatusCode);

        await api.ConfirmEmailAsync(email);

        Assert.Equal(HttpStatusCode.OK, (await Login(client, email)).StatusCode);
    }

    [Fact]
    public async Task Only_whoever_knows_the_password_learns_that_the_account_is_unconfirmed()
    {
        var client = api.CreateClient();
        var username = Username("priv");
        var email = $"{username}@example.com";
        await Register(client, username, email);

        var wrong = await Login(client, email, "Wr0ngPassword");
        var unknown = await Login(client, $"nobody_{Guid.NewGuid():N}@example.com", "Wr0ngPassword");

        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        Assert.Equal((await unknown.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString(),
            (await wrong.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task The_403_for_an_unconfirmed_account_explains_what_to_do_in_the_language_of_the_request()
    {
        var client = api.CreateClient();
        var username = Username("lang");
        var email = $"{username}@example.com";
        await Register(client, username, email);
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("pt-BR");

        var res = await Login(client, email);

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        Assert.Contains("Confirme seu e-mail", (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task A_cookie_sign_in_of_an_unconfirmed_account_is_refused_and_sets_no_cookie()
    {
        var client = api.CreateClient();
        var username = Username("cook");
        var email = $"{username}@example.com";
        await Register(client, username, email);

        var res = await Login(client, email, cookies: true);

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        Assert.False(res.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Cookie_sign_in_works_once_the_email_is_confirmed()
    {
        var (_, username) = await api.CreateUserAsync("ckok");
        var client = api.CreateClient(new() { HandleCookies = true, BaseAddress = new Uri("https://localhost") });

        var res = await Login(client, $"{username}@example.com", cookies: true);

        Assert.True(res.IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/users/me")).StatusCode);
    }

    [Fact]
    public async Task Signing_up_with_an_address_that_has_an_account_answers_exactly_like_a_new_address()
    {
        var (_, existingUsername) = await api.CreateUserAsync("have");
        var existingEmail = $"{existingUsername}@example.com";
        var freshUsername = Username("fresh");

        var again = await Register(api.CreateClient(), freshUsername, existingEmail);
        var brandNew = await Register(api.CreateClient(), Username("newb"), $"new_{Guid.NewGuid():N}@example.com");

        Assert.Equal(HttpStatusCode.Accepted, again.StatusCode);
        Assert.Equal(brandNew.StatusCode, again.StatusCode);
        Assert.Equal(await brandNew.Content.ReadAsStringAsync(), await again.Content.ReadAsStringAsync());
        // Nothing was created for the existing address, and the username that was tried stays free.
        Assert.Equal(1, await api.WithDbAsync(db => db.Users.CountAsync(u => u.Email == existingEmail)));
        Assert.Equal(0, await api.WithDbAsync(db => db.Users.CountAsync(u => u.UserName == freshUsername)));
    }

    [Fact]
    public async Task A_weak_password_is_refused_the_same_way_for_new_and_existing_addresses()
    {
        var (_, existingUsername) = await api.CreateUserAsync("weak");

        var onExisting = await Register(api.CreateClient(), Username("w1"), $"{existingUsername}@example.com", "Password1");
        var onNew = await Register(api.CreateClient(), Username("w2"), $"new_{Guid.NewGuid():N}@example.com", "Password1");

        Assert.Equal(await ErrorsOf(onNew), await ErrorsOf(onExisting));
    }

    [Fact]
    public async Task A_taken_username_is_still_reported_because_usernames_are_public()
    {
        var (_, taken) = await api.CreateUserAsync("pub");

        var res = await Register(api.CreateClient(), taken, $"new_{Guid.NewGuid():N}@example.com");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.True((await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").TryGetProperty("username", out _));
    }

    [Fact]
    public async Task Confirming_with_a_wrong_missing_or_oversized_code_gives_one_answer_for_known_and_unknown_addresses()
    {
        var client = api.CreateClient();
        var username = Username("cod");
        var email = $"{username}@example.com";
        await Register(client, username, email);

        var answers = new[]
        {
            await ErrorsOf(await client.PostAsJsonAsync("/api/v1/auth/confirm-email", new { email, code = "abc" })),
            await ErrorsOf(await client.PostAsJsonAsync("/api/v1/auth/confirm-email", new { email })),
            await ErrorsOf(await client.PostAsJsonAsync("/api/v1/auth/confirm-email", new { email, code = new string('A', 5000) })),
            await ErrorsOf(await client.PostAsJsonAsync("/api/v1/auth/confirm-email", new { email = "nobody@example.com", code = "abc" })),
            await ErrorsOf(await client.PostAsJsonAsync("/api/v1/auth/confirm-email", new { })),
        };

        Assert.Single(answers.Distinct());
        Assert.Equal(HttpStatusCode.Forbidden, (await Login(client, email)).StatusCode); // still unconfirmed
    }

    [Fact]
    public async Task Asking_for_a_new_confirmation_always_answers_202()
    {
        var client = api.CreateClient();
        foreach (var email in new[] { "nobody@example.com", TechRatFactory.AdminEmail, "", "   ", new string('a', 400) + "@example.com" })
            Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/resend-confirmation", new { email })).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/resend-confirmation", new { })).StatusCode);
    }

    [Fact]
    public async Task The_administrator_created_by_the_seed_can_still_sign_in()
    {
        var res = await Login(api.CreateClient(), TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }
}
