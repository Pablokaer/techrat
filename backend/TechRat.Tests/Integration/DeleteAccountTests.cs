using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Common;
using TechRat.Application.Identity;
using TechRat.Application.Leaderboards;
using TechRat.Domain.Users;

namespace TechRat.Tests.Integration;

/// <summary>
/// Account deletion (required by Google Play): the owner proves who they are, every personal record goes, every token
/// stops working at once, other learners are untouched and the last administrator cannot lock the platform out.
/// See ADR-0023.
/// </summary>
[Collection(ApiCollection.Name)]
public class DeleteAccountTests(TechRatFactory api)
{
    private const string Url = "/api/v1/account";
    private const string Password = "Passw0rdX";

    private static Task<HttpResponseMessage> DeleteAsync(HttpClient client, object body, string? language = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, Url) { Content = JsonContent.Create(body) };
        if (language is not null) request.Headers.AcceptLanguage.Add(new StringWithQualityHeaderValue(language));
        return client.SendAsync(request);
    }

    private static async Task<JsonElement> ErrorsAsync(HttpResponseMessage res)
    {
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
    }

    /// <summary>A learner with real progress: answered questions (attempts, XP, topic progress, session) and a photo.</summary>
    private async Task<(HttpClient Client, string Username, Guid Id)> LearnerWithDataAsync()
    {
        var (client, username) = await api.CreateUserAsync("del");
        var session = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "kubernetes", difficulty = "Expert", count = 2 });
        foreach (var q in session.Questions) await Practice.AnswerAsync(api, client, session, q, true);
        var id = await api.UserIdAsync(username);
        await api.WithDbAsync(async db =>
        {
            db.UserAvatars.Add(new UserAvatar { UserId = id, Content = [1, 2, 3], ContentType = "image/png", UpdatedAt = DateTimeOffset.UtcNow });
            await db.SaveChangesAsync();
        });
        await api.DrainOutboxAsync();
        return (client, username, id);
    }

    /// <summary>Rows that belong to the account across every table, by name. All must be zero after deletion.</summary>
    private Task<Dictionary<string, int>> RowsOfAsync(Guid id) => api.WithDbAsync(async db => new Dictionary<string, int>
    {
        ["identity.users"] = await db.Set<ApplicationUser>().CountAsync(u => u.Id == id),
        ["identity.user_roles"] = await db.Set<IdentityUserRole<Guid>>().CountAsync(r => r.UserId == id),
        ["identity.user_logins"] = await db.Set<IdentityUserLogin<Guid>>().CountAsync(r => r.UserId == id),
        ["identity.user_claims"] = await db.Set<IdentityUserClaim<Guid>>().CountAsync(r => r.UserId == id),
        ["identity.user_tokens"] = await db.Set<IdentityUserToken<Guid>>().CountAsync(r => r.UserId == id),
        ["learning.users"] = await db.UserProfiles.CountAsync(u => u.Id == id),
        ["learning.user_avatars"] = await db.UserAvatars.CountAsync(a => a.UserId == id),
        ["learning.question_attempts"] = await db.QuestionAttempts.CountAsync(a => a.UserId == id),
        ["learning.practice_sessions"] = await db.PracticeSessions.CountAsync(s => s.UserId == id),
        ["learning.daily_challenge_completions"] = await db.DailyChallengeCompletions.CountAsync(c => c.UserId == id),
        ["learning.user_topic_progress"] = await db.UserTopicProgress.CountAsync(p => p.UserId == id),
        ["gamification.xp_transactions"] = await db.XPTransactions.CountAsync(x => x.UserId == id),
        ["gamification.user_achievements"] = await db.UserAchievements.CountAsync(a => a.UserId == id),
        ["notifications.notifications"] = await db.Notifications.CountAsync(n => n.UserId == id),
        ["roadmaps.user_roadmap_progress"] = await db.UserRoadmapProgress.CountAsync(p => p.UserId == id),
        ["roadmaps.user_module_progress"] = await db.UserModuleProgress.CountAsync(p => p.UserId == id),
        ["roadmaps.user_module_step_completions"] = await db.UserModuleStepCompletions.CountAsync(c => c.UserId == id),
    });

    private static async Task<LeaderboardDto> BoardAsync(HttpClient client, string scope) =>
        (await client.GetFromJsonAsync<LeaderboardDto>($"/api/v1/leaderboards/{scope}?topic=kubernetes&pageSize=100", TechRatFactory.Json))!;

    // ------------------------------------------------------------------ proving who is asking

    [Fact]
    public async Task A_wrong_password_is_rejected_counts_towards_lockout_and_keeps_the_account()
    {
        var (client, _, id) = await LearnerWithDataAsync();

        var errors = await ErrorsAsync(await DeleteAsync(client, new { password = "Wr0ngPassword" }));
        Assert.True(errors.TryGetProperty("password", out _));

        Assert.Equal(1, await api.WithDbAsync(db => db.Set<ApplicationUser>().Where(u => u.Id == id).Select(u => u.AccessFailedCount).SingleAsync()));
        Assert.Equal(1, (await RowsOfAsync(id))["learning.users"]);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/users/me")).StatusCode);
    }

    [Fact]
    public async Task The_password_is_required_for_accounts_that_have_one()
    {
        var (client, _) = await api.CreateUserAsync("del");
        Assert.True((await ErrorsAsync(await DeleteAsync(client, new { password = "" }))).TryGetProperty("password", out _));
        Assert.True((await ErrorsAsync(await DeleteAsync(client, new { }))).TryGetProperty("password", out _));
    }

    [Fact]
    public async Task Accounts_without_a_password_confirm_by_typing_their_username()
    {
        var (client, username) = await api.CreateUserAsync("del");
        var id = await api.UserIdAsync(username);
        using (var scope = api.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            Assert.True((await users.RemovePasswordAsync((await users.FindByNameAsync(username))!)).Succeeded);
        }

        Assert.True((await ErrorsAsync(await DeleteAsync(client, new { }))).TryGetProperty("confirmation", out _));
        Assert.True((await ErrorsAsync(await DeleteAsync(client, new { confirmation = "someone_else" }))).TryGetProperty("confirmation", out _));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/users/me")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(client, new { confirmation = username.ToUpperInvariant() })).StatusCode);
        Assert.Equal(0, (await RowsOfAsync(id)).Values.Sum());
    }

    [Fact]
    public async Task Signed_out_requests_are_rejected()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await DeleteAsync(api.CreateClient(), new { password = Password })).StatusCode);
    }

    [Fact]
    public void Attempts_are_rate_limited()
    {
        var endpoint = api.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Single(e => e.RoutePattern.RawText?.TrimEnd('/') == Url && e.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods.Contains("DELETE"));
        Assert.Equal("auth", endpoint.Metadata.GetMetadata<EnableRateLimitingAttribute>()!.PolicyName);
    }

    // ------------------------------------------------------------------ what is deleted

    [Fact]
    public async Task Deleting_removes_every_record_of_the_account()
    {
        var (client, _, id) = await LearnerWithDataAsync();
        var before = await RowsOfAsync(id);
        Assert.All(new[] { "identity.users", "learning.users", "learning.user_avatars", "learning.question_attempts", "learning.practice_sessions",
                           "gamification.xp_transactions", "learning.user_topic_progress" }, key => Assert.True(before[key] > 0, key));

        var res = await DeleteAsync(client, new { password = Password });

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        var after = await RowsOfAsync(id);
        Assert.All(after, row => Assert.True(row.Value == 0, $"{row.Key} still has {row.Value} row(s)"));
    }

    [Fact]
    public async Task Another_learners_data_is_untouched()
    {
        var (gone, _, goneId) = await LearnerWithDataAsync();
        var (kept, keptUsername, keptId) = await LearnerWithDataAsync();
        var keptBefore = await RowsOfAsync(keptId);

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(gone, new { password = Password })).StatusCode);

        Assert.Equal(keptBefore, await RowsOfAsync(keptId));
        var me = await kept.GetFromJsonAsync<JsonElement>("/api/v1/users/me");
        Assert.Equal(keptUsername, me.GetProperty("username").GetString());
        Assert.Equal(0, (await RowsOfAsync(goneId)).Values.Sum());
    }

    [Theory]
    [InlineData("Global")]
    [InlineData("Weekly")]
    [InlineData("Monthly")]
    [InlineData("Topic")]
    public async Task The_learner_leaves_every_leaderboard_even_while_pages_are_cached(string scope)
    {
        var (gone, goneUsername, _) = await LearnerWithDataAsync();
        var (other, _, _) = await LearnerWithDataAsync();
        // Other tests may have cached this page for 30 s before these learners existed: start from a fresh page, then cache it.
        await api.Services.GetRequiredService<ICacheService>().RemoveAsync(CacheKeys.Leaderboard(scope, "kubernetes", 1, 100));
        Assert.Contains((await BoardAsync(other, scope)).Entries, e => e.Username == goneUsername);   // also caches the page, which must not keep showing the learner

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(gone, new { password = Password })).StatusCode);

        Assert.DoesNotContain((await BoardAsync(other, scope)).Entries, e => e.Username == goneUsername);
    }

    [Fact]
    public async Task A_progress_event_queued_before_the_deletion_is_handled_without_errors()
    {
        var (client, _) = await api.CreateUserAsync("del");
        var session = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "kubernetes", difficulty = "Expert", count = 1 });
        await Practice.AnswerAsync(api, client, session, session.Questions[0], true);   // queues user.progress-changed, not yet dispatched
        var id = await api.UserIdAsync((await client.GetFromJsonAsync<JsonElement>("/api/v1/users/me")).GetProperty("username").GetString()!);

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(client, new { password = Password })).StatusCode);
        await api.DrainOutboxAsync();

        // payload is jsonb: filter in memory rather than translating Contains
        var messages = (await api.WithDbAsync(db => db.OutboxMessages.ToListAsync())).Where(m => m.Payload.Contains(id.ToString())).ToList();
        Assert.NotEmpty(messages);
        Assert.All(messages, m => { Assert.NotNull(m.ProcessedAt); Assert.Null(m.LastError); });
    }

    // ------------------------------------------------------------------ tokens

    [Fact]
    public async Task Every_bearer_token_stops_working_at_once_and_signing_in_fails()
    {
        var (_, username) = await api.CreateUserAsync("del");
        var email = $"{username}@example.com";
        var device = api.CreateClient();
        var tokens = await TechRatFactory.LoginAsync(device, email, Password);
        var otherDevice = api.CreateClient();
        var otherTokens = await TechRatFactory.LoginAsync(otherDevice, email, Password);
        Assert.Equal(HttpStatusCode.OK, (await device.GetAsync("/api/v1/users/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await otherDevice.GetAsync("/api/v1/users/me")).StatusCode);   // also warms the "account exists" cache

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(device, new { password = Password })).StatusCode);

        // The access tokens are still within their lifetime, yet neither device gets in.
        Assert.Equal(HttpStatusCode.Unauthorized, (await device.GetAsync("/api/v1/users/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await otherDevice.GetAsync("/api/v1/users/me")).StatusCode);
        foreach (var t in new[] { tokens, otherTokens })
        {
            var refresh = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = t.GetProperty("refreshToken").GetString() });
            Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
        }
        var login = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/login", new { email, password = Password });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task A_browser_session_is_signed_out_and_its_cookie_cleared()
    {
        var (_, username) = await api.CreateUserAsync("del");
        var browser = api.CreateClient(new() { HandleCookies = true, BaseAddress = new Uri("https://localhost") });
        (await browser.PostAsJsonAsync("/api/v1/auth/login?useCookies=true", new { email = $"{username}@example.com", password = Password })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/v1/users/me")).StatusCode);

        var res = await DeleteAsync(browser, new { password = Password });

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Contains(res.Headers.GetValues("Set-Cookie"), c => c.StartsWith("techrat.auth=;", StringComparison.Ordinal) || c.Contains("expires=Thu, 01 Jan 1970", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/v1/users/me")).StatusCode);
    }

    // ------------------------------------------------------------------ administrators

    private async Task<(HttpClient Client, Guid Id)> NewAdminAsync()
    {
        var (client, username) = await api.CreateUserAsync("adm");
        using var scope = api.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = (await users.FindByNameAsync(username))!;
        Assert.True((await users.AddToRoleAsync(user, Roles.Admin)).Succeeded);
        return (client, user.Id);
    }

    [Fact]
    public async Task The_last_administrator_cannot_delete_the_account()
    {
        var (admin, adminId) = await NewAdminAsync();
        using var scope = api.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var seeded = (await users.FindByEmailAsync(TechRatFactory.AdminEmail))!;
        Assert.True((await users.RemoveFromRoleAsync(seeded, Roles.Admin)).Succeeded);   // the new account is now the only administrator
        try
        {
            var res = await DeleteAsync(admin, new { password = Password });

            Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
            Assert.Equal(1, (await RowsOfAsync(adminId))["learning.users"]);
            Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/v1/users/me")).StatusCode);
        }
        finally
        {
            await users.AddToRoleAsync(seeded, Roles.Admin);   // the other tests rely on the seeded administrator
            await users.RemoveFromRoleAsync((await users.FindByIdAsync(adminId.ToString()))!, Roles.Admin);
        }
    }

    [Fact]
    public async Task An_administrator_can_delete_the_account_while_another_administrator_remains()
    {
        var (admin, adminId) = await NewAdminAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(admin, new { password = Password })).StatusCode);

        Assert.Equal(0, (await RowsOfAsync(adminId)).Values.Sum());
        using var scope = api.Services.CreateScope();
        Assert.NotEmpty(await scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>().GetUsersInRoleAsync(Roles.Admin));
    }

    // ------------------------------------------------------------------ the notice

    [Fact]
    public async Task The_owner_is_emailed_that_the_account_was_deleted()
    {
        var sent = new CapturingAccountEmailSender();
        using var app = api.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<IAccountEmailSender>(sent)));
        var client = app.CreateClient();
        var username = $"delm_{Guid.NewGuid():N}"[..20];
        (await client.PostAsJsonAsync("/api/v1/auth/register", new { email = $"{username}@example.com", password = Password, username })).EnsureSuccessStatusCode();
        await TechRatFactory.LoginAsync(client, $"{username}@example.com", Password);

        (await DeleteAsync(client, new { password = Password })).EnsureSuccessStatusCode();

        Assert.Equal([$"{username}@example.com"], sent.Deleted);
    }

    [Fact]
    public async Task A_failing_email_does_not_undo_the_deletion()
    {
        var failing = new CapturingAccountEmailSender { Fail = true };
        using var app = api.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<IAccountEmailSender>(failing)));
        var client = app.CreateClient();
        var username = $"delf_{Guid.NewGuid():N}"[..20];
        (await client.PostAsJsonAsync("/api/v1/auth/register", new { email = $"{username}@example.com", password = Password, username })).EnsureSuccessStatusCode();
        await TechRatFactory.LoginAsync(client, $"{username}@example.com", Password);

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAsync(client, new { password = Password })).StatusCode);
        Assert.Null(await api.Services.CreateScope().ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>().FindByNameAsync(username));
    }

    private sealed class CapturingAccountEmailSender : IAccountEmailSender
    {
        public bool Fail { get; init; }
        private readonly ConcurrentQueue<string> _deleted = new();
        public string[] Deleted => [.. _deleted];
        public Task SendPasswordChangedAsync(string email, CancellationToken ct) => Task.CompletedTask;
        public Task SendAccountDeletedAsync(string email, CancellationToken ct)
        {
            if (Fail) throw new EmailDeliveryException("smtp down");
            _deleted.Enqueue(email);
            return Task.CompletedTask;
        }
    }
}
