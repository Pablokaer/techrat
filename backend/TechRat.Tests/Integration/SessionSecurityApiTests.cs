using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace TechRat.Tests.Integration;

/// <summary>
/// Bearer sessions (mobile, desktop): single-use refresh tokens with reuse detection, nothing cacheable, small bodies
/// for credentials (ADR-0030).
/// </summary>
[Collection(ApiCollection.Name)]
public class SessionSecurityApiTests(TechRatFactory api)
{
    private const string Password = "Passw0rdX";

    private static async Task<JsonElement> LoginAsync(HttpClient client, string username)
    {
        var res = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = $"{username}@example.com", password = Password });
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static Task<HttpResponseMessage> RefreshAsync(HttpClient client, string? refreshToken) =>
        client.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken });

    private static async Task<string> RefreshTokenOf(HttpResponseMessage res)
    {
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("refreshToken").GetString()!;
    }

    private WebApplicationFactory<Program> WithGrace(int seconds) =>
        api.WithWebHostBuilder(b => b.UseSetting("Auth:RefreshGraceSeconds", seconds.ToString()));

    [Fact]
    public async Task Every_refresh_returns_a_new_refresh_token_and_the_chain_keeps_working()
    {
        var (_, username) = await api.CreateUserAsync("rot");
        var client = api.CreateClient();
        var t0 = (await LoginAsync(client, username)).GetProperty("refreshToken").GetString()!;

        var t1 = await RefreshTokenOf(await RefreshAsync(client, t0));
        var t2 = await RefreshTokenOf(await RefreshAsync(client, t1));
        var t3 = await RefreshTokenOf(await RefreshAsync(client, t2));

        Assert.Equal(4, new[] { t0, t1, t2, t3 }.Distinct().Count());
    }

    [Fact]
    public async Task The_new_access_token_works()
    {
        var (_, username) = await api.CreateUserAsync("acc");
        var client = api.CreateClient();
        var refreshed = await (await RefreshAsync(client, (await LoginAsync(client, username)).GetProperty("refreshToken").GetString())).Content.ReadFromJsonAsync<JsonElement>();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", refreshed.GetProperty("accessToken").GetString());

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/users/me")).StatusCode);
    }

    [Fact]
    public async Task Presenting_a_used_refresh_token_revokes_the_session_for_whoever_holds_the_newer_one_too()
    {
        await using var factory = WithGrace(0);
        var (_, username) = await api.CreateUserAsync("reuse");
        var client = factory.CreateClient();
        var t0 = (await LoginAsync(client, username)).GetProperty("refreshToken").GetString()!;
        var t1 = await RefreshTokenOf(await RefreshAsync(client, t0)); // the owner refreshes normally

        var thief = await RefreshAsync(client, t0); // someone replays the token the owner already used
        Assert.Equal(HttpStatusCode.Unauthorized, thief.StatusCode);

        var owner = await RefreshAsync(client, t1); // the session is dead for the owner as well, who has to sign in again
        Assert.Equal(HttpStatusCode.Unauthorized, owner.StatusCode);
    }

    [Fact]
    public async Task A_refresh_token_can_be_retried_right_after_use_when_the_answer_was_lost()
    {
        var (_, username) = await api.CreateUserAsync("retry");
        var client = api.CreateClient();
        var t0 = (await LoginAsync(client, username)).GetProperty("refreshToken").GetString()!;
        await RefreshTokenOf(await RefreshAsync(client, t0)); // the response never reached the app

        var retry = await RefreshAsync(client, t0);

        Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await RefreshAsync(client, await RefreshTokenOf(retry))).StatusCode);
    }

    [Fact]
    public async Task Another_device_keeps_working_when_one_session_is_revoked()
    {
        await using var factory = WithGrace(0);
        var (_, username) = await api.CreateUserAsync("two");
        var client = factory.CreateClient();
        var phone = (await LoginAsync(client, username)).GetProperty("refreshToken").GetString()!;
        var laptop = (await LoginAsync(client, username)).GetProperty("refreshToken").GetString()!;

        await RefreshTokenOf(await RefreshAsync(client, phone));
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(client, phone)).StatusCode); // reuse: the phone session dies

        Assert.Equal(HttpStatusCode.OK, (await RefreshAsync(client, laptop)).StatusCode);
    }

    [Fact]
    public async Task Changing_the_password_still_leaves_the_calling_device_able_to_refresh()
    {
        var (_, username) = await api.CreateUserAsync("chg2");
        var client = api.CreateClient();
        var tokens = await LoginAsync(client, username);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.GetProperty("accessToken").GetString());

        var change = await client.PostAsJsonAsync("/api/v1/auth/change-password", new { currentPassword = Password, newPassword = "N3wPassw0rdQ" });
        var renewed = await change.Content.ReadFromJsonAsync<JsonElement>(); // tokens that carry no session ids yet

        Assert.Equal(HttpStatusCode.OK, change.StatusCode);
        var anonymous = api.CreateClient();
        var first = await RefreshTokenOf(await RefreshAsync(anonymous, renewed.GetProperty("refreshToken").GetString()));
        Assert.Equal(HttpStatusCode.OK, (await RefreshAsync(anonymous, first)).StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-a-token")]
    public async Task A_missing_or_forged_refresh_token_is_refused_not_a_server_error(string? token)
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(api.CreateClient(), token)).StatusCode);
    }

    [Fact]
    public async Task Sign_in_and_account_responses_are_never_stored_by_caches()
    {
        var (client, username) = await api.CreateUserAsync("cache");

        var login = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new { email = $"{username}@example.com", password = Password });
        var me = await client.GetAsync("/api/v1/users/me");

        Assert.Equal("no-store", login.Headers.CacheControl?.ToString());
        Assert.Contains("no-store", me.Headers.CacheControl?.ToString());
    }

    [Theory]
    [InlineData("/api/v1/auth/login")]
    [InlineData("/api/v1/auth/register")]
    [InlineData("/api/v1/auth/forgot-password")]
    public async Task A_credentials_request_with_an_oversized_body_is_refused(string url)
    {
        var json = $"{{\"email\":\"a@example.com\",\"password\":\"{new string('x', 20_000)}\"}}";

        var res = await api.CreateClient().PostAsync(url, new StringContent(json, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, res.StatusCode);
    }

    [Fact]
    public async Task Ordinary_credentials_requests_are_not_affected_by_the_small_body_limit()
    {
        var (_, username) = await api.CreateUserAsync("small");

        var res = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new { email = $"{username}@example.com", password = Password });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }
}
