using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Common;
using TechRat.Application.Identity;

namespace TechRat.Tests.Integration;

/// <summary>
/// Changing the password from Settings: the server checks the current password, applies the sign-up rules, keeps the
/// session that made the change, signs every other session out and emails the account owner.
/// </summary>
[Collection(ApiCollection.Name)]
public class ChangePasswordTests(TechRatFactory api)
{
    private const string Old = "Passw0rdX";
    private const string New = "N3wPassword";
    private const string Url = "/api/v1/auth/change-password";

    private static async Task<HttpResponseMessage> LoginAsync(HttpClient client, string username, string password, bool cookies = false) =>
        await client.PostAsJsonAsync($"/api/v1/auth/login{(cookies ? "?useCookies=true" : "")}", new { email = $"{username}@example.com", password });

    private static async Task<JsonElement> ErrorsAsync(HttpResponseMessage res)
    {
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
    }

    [Fact]
    public async Task A_bearer_session_gets_new_tokens_and_every_other_session_is_signed_out()
    {
        var (client, username) = await api.CreateUserAsync("pw");
        var other = await (await LoginAsync(api.CreateClient(), username, Old)).Content.ReadFromJsonAsync<JsonElement>();

        var res = await client.PostAsJsonAsync(Url, new { currentPassword = Old, newPassword = New });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var tokens = await res.Content.ReadFromJsonAsync<JsonElement>();
        var body = await res.Content.ReadAsStringAsync();
        Assert.DoesNotContain(Old, body);
        Assert.DoesNotContain(New, body);

        // This session continues with the new tokens...
        var fresh = api.CreateClient();
        fresh.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.GetProperty("accessToken").GetString());
        Assert.Equal(HttpStatusCode.OK, (await fresh.GetAsync("/api/v1/users/me")).StatusCode);
        var renewed = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = tokens.GetProperty("refreshToken").GetString() });
        Assert.Equal(HttpStatusCode.OK, renewed.StatusCode);

        // ...while the other session can no longer renew its tokens.
        var stale = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = other.GetProperty("refreshToken").GetString() });
        Assert.Equal(HttpStatusCode.Unauthorized, stale.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(api.CreateClient(), username, Old)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(api.CreateClient(), username, New)).StatusCode);
    }

    [Fact]
    public async Task A_cookie_session_stays_signed_in_with_a_renewed_cookie()
    {
        var (_, username) = await api.CreateUserAsync("pw");
        var browser = api.CreateClient(new() { HandleCookies = true, BaseAddress = new Uri("https://localhost") });
        (await LoginAsync(browser, username, Old, cookies: true)).EnsureSuccessStatusCode();

        var res = await browser.PostAsJsonAsync(Url, new { currentPassword = Old, newPassword = New });
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Contains(res.Headers.GetValues("Set-Cookie"), c => c.StartsWith("techrat.auth=", StringComparison.Ordinal));
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/v1/users/me")).StatusCode);
    }

    [Fact]
    public async Task The_current_password_is_checked_on_the_server_and_failures_count_towards_lockout()
    {
        var (client, username) = await api.CreateUserAsync("pw");
        var errors = await ErrorsAsync(await client.PostAsJsonAsync(Url, new { currentPassword = "Wr0ngPassword", newPassword = New }));
        Assert.True(errors.TryGetProperty("currentPassword", out _));
        var failures = await api.WithDbAsync(db => db.Set<ApplicationUser>().Where(u => u.UserName == username).Select(u => u.AccessFailedCount).SingleAsync());
        Assert.Equal(1, failures);
        // The password did not change (a successful login also resets the failure count).
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(api.CreateClient(), username, Old)).StatusCode);
    }

    [Fact]
    public async Task The_current_password_is_required()
    {
        var (client, _) = await api.CreateUserAsync("pw");
        var errors = await ErrorsAsync(await client.PostAsJsonAsync(Url, new { currentPassword = "", newPassword = New }));
        Assert.True(errors.TryGetProperty("currentPassword", out _));
    }

    [Fact]
    public async Task The_new_password_follows_the_sign_up_rules()
    {
        var (client, _) = await api.CreateUserAsync("pw");
        var errors = await ErrorsAsync(await client.PostAsJsonAsync(Url, new { currentPassword = Old, newPassword = "short" }));
        Assert.True(errors.GetProperty("newPassword").GetArrayLength() >= 2);   // length, uppercase and digit rules
    }

    [Fact]
    public async Task The_new_password_must_differ_from_the_current_one()
    {
        var (client, _) = await api.CreateUserAsync("pw");
        var errors = await ErrorsAsync(await client.PostAsJsonAsync(Url, new { currentPassword = Old, newPassword = Old }));
        Assert.True(errors.TryGetProperty("newPassword", out _));
    }

    [Fact]
    public async Task Signed_out_requests_are_rejected()
    {
        var res = await api.CreateClient().PostAsJsonAsync(Url, new { currentPassword = Old, newPassword = New });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task An_account_without_a_password_can_set_one_without_a_current_password()
    {
        // Accounts created through an external provider (GitHub, Google...) have no password.
        var (client, username) = await api.CreateUserAsync("pw");
        using (var scope = api.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            Assert.True((await users.RemovePasswordAsync((await users.FindByNameAsync(username))!)).Succeeded);
        }
        Assert.False((await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/password")).GetProperty("hasPassword").GetBoolean());

        var res = await client.PostAsJsonAsync(Url, new { newPassword = New });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(api.CreateClient(), username, New)).StatusCode);
    }

    [Fact]
    public async Task Accounts_report_that_they_have_a_password()
    {
        var (client, _) = await api.CreateUserAsync("pw");
        Assert.True((await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/password")).GetProperty("hasPassword").GetBoolean());
    }

    [Fact]
    public async Task The_owner_is_emailed_that_the_password_changed()
    {
        var sent = new CapturingAccountEmailSender();
        using var app = api.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<IAccountEmailSender>(sent)));
        var client = app.CreateClient();
        var username = $"pwm_{Guid.NewGuid():N}"[..20];
        (await client.PostAsJsonAsync("/api/v1/auth/register", new { email = $"{username}@example.com", password = Old, username })).EnsureSuccessStatusCode();
        await TechRatFactory.LoginAsync(client, $"{username}@example.com", Old);

        (await client.PostAsJsonAsync(Url, new { currentPassword = Old, newPassword = New })).EnsureSuccessStatusCode();
        Assert.Equal([$"{username}@example.com"], sent.PasswordChanged);
    }

    [Fact]
    public void Attempts_are_rate_limited()
    {
        var endpoint = api.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Single(e => e.RoutePattern.RawText == Url);
        Assert.Equal("auth", endpoint.Metadata.GetMetadata<EnableRateLimitingAttribute>()!.PolicyName);
    }

    private sealed class CapturingAccountEmailSender : IAccountEmailSender
    {
        public ConcurrentQueue<string> Queue { get; } = new();
        public string[] PasswordChanged => [.. Queue];
        public Task SendPasswordChangedAsync(string email, CancellationToken ct)
        {
            Queue.Enqueue(email);
            return Task.CompletedTask;
        }
    }
}
