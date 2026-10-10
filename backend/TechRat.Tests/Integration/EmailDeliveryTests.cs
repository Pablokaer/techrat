using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using TechRat.Application.Identity;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace TechRat.Tests.Integration;

/// <summary>Real SMTP delivery against a disposable Mailpit (SMTP 1025, HTTP API 8025).</summary>
[Collection(ApiCollection.Name)]
public class EmailDeliveryTests(TechRatFactory api) : IAsyncLifetime
{
    private IContainer _mailpit = null!;
    private HttpClient _mailApi = null!;

    public async Task InitializeAsync()
    {
        _mailpit = new ContainerBuilder("axllent/mailpit:latest")
            .WithPortBinding(1025, true).WithPortBinding(8025, true)
            .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(r => r.ForPath("/api/v1/info").ForPort(8025)))
            .Build();
        await _mailpit.StartAsync();
        _mailApi = new HttpClient { BaseAddress = new Uri($"http://{_mailpit.Hostname}:{_mailpit.GetMappedPublicPort(8025)}") };
    }

    public async Task DisposeAsync()
    {
        _mailApi.Dispose();
        await _mailpit.DisposeAsync();
    }

    private WebApplicationFactory<Program> WithSmtp(string host, int port) => api.WithWebHostBuilder(b =>
    {
        b.UseSetting("Smtp:Host", host);
        b.UseSetting("Smtp:Port", port.ToString());
        b.UseSetting("Smtp:Security", "None");
        b.UseSetting("Smtp:From", "TechRat <no-reply@techrat.test>");
        b.UseSetting("App:PublicWebUrl", "https://techrat.test");
    });

    private WebApplicationFactory<Program> WithMailpit() => WithSmtp(_mailpit.Hostname, _mailpit.GetMappedPublicPort(1025));

    private async Task<JsonElement> WaitForMessageToAsync(string to)
    {
        for (var i = 0; i < 50; i++)
        {
            var list = await _mailApi.GetFromJsonAsync<JsonElement>($"/api/v1/search?query={Uri.EscapeDataString($"to:{to}")}");
            var messages = list.GetProperty("messages");
            if (messages.GetArrayLength() > 0)
                return await _mailApi.GetFromJsonAsync<JsonElement>($"/api/v1/message/{messages[0].GetProperty("ID").GetString()}");
            await Task.Delay(100);
        }
        throw new TimeoutException($"No email to {to}");
    }

    private async Task<JsonElement> WaitForSubjectAsync(string to, string subjectContains)
    {
        for (var i = 0; i < 60; i++)
        {
            var list = await _mailApi.GetFromJsonAsync<JsonElement>($"/api/v1/search?query={Uri.EscapeDataString($"to:{to}")}");
            foreach (var m in list.GetProperty("messages").EnumerateArray())
                if (m.GetProperty("Subject").GetString()!.Contains(subjectContains, StringComparison.OrdinalIgnoreCase))
                    return await _mailApi.GetFromJsonAsync<JsonElement>($"/api/v1/message/{m.GetProperty("ID").GetString()}");
            await Task.Delay(100);
        }
        throw new TimeoutException($"No email to {to} with '{subjectContains}' in the subject");
    }

    [Fact]
    public async Task Admins_can_send_a_test_email_to_check_the_smtp_settings()
    {
        await using var factory = WithMailpit();
        var admin = factory.CreateClient();
        await TechRatFactory.LoginAsync(admin, TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);

        var res = await admin.PostAsJsonAsync("/api/v1/admin/email/test", new { to = "ops@techrat.test" });
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var message = await WaitForMessageToAsync("ops@techrat.test");
        Assert.Equal("TechRat SMTP test", message.GetProperty("Subject").GetString());
        Assert.Contains("no-reply@techrat.test", message.GetProperty("From").GetProperty("Address").GetString());
        Assert.False(string.IsNullOrWhiteSpace(message.GetProperty("HTML").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(message.GetProperty("Text").GetString()));
    }

    [Fact]
    public async Task Password_reset_email_arrives_in_the_requested_language_with_a_link_to_the_web_app()
    {
        await using var factory = WithMailpit();
        var client = factory.CreateClient();
        var username = $"mail_{Guid.NewGuid():N}"[..20];
        var email = $"{username}@example.com";
        (await client.PostAsJsonAsync("/api/v1/auth/register", new { email, password = "Passw0rdX", username, displayName = "Mail" })).EnsureSuccessStatusCode();

        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("pt-BR");
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { email })).StatusCode);

        var message = await WaitForMessageToAsync(email);
        Assert.Equal("Redefina sua senha do TechRat", message.GetProperty("Subject").GetString());
        Assert.Contains("https://techrat.test/reset-password?email=", message.GetProperty("HTML").GetString());
        Assert.Contains("https://techrat.test/reset-password?email=", message.GetProperty("Text").GetString());
    }

    [Fact]
    public async Task Resetting_the_password_unlocks_the_account_and_tells_the_owner()
    {
        await using var factory = WithMailpit();
        var client = factory.CreateClient();
        var username = $"unlock_{Guid.NewGuid():N}"[..20];
        var email = $"{username}@example.com";
        (await client.PostAsJsonAsync("/api/v1/auth/register", new { email, password = "Passw0rdX", username, displayName = "Unlock" })).EnsureSuccessStatusCode();
        for (var i = 0; i < AuthPolicy.MaxFailedAccessAttempts; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "Wr0ngPassword" })).StatusCode);
        // Locked: even the right password is refused now.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "Passw0rdX" })).StatusCode);

        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { email })).StatusCode);
        var link = (await WaitForSubjectAsync(email, "Reset your TechRat password")).GetProperty("Text").GetString()!;
        var code = Uri.UnescapeDataString(Regex.Match(link, @"code=([^\s&""<>]+)").Groups[1].Value);
        Assert.False(string.IsNullOrEmpty(code));

        var reset = await client.PostAsJsonAsync("/api/v1/auth/reset-password", new { email, resetCode = code, newPassword = "N3wPassw0rdZ" });

        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "N3wPassw0rdZ" })).StatusCode);
        var notice = await WaitForSubjectAsync(email, "password was changed");
        Assert.Contains("https://techrat.test/forgot-password", notice.GetProperty("Text").GetString());
    }

    [Fact]
    public async Task Password_reset_emails_are_limited_to_one_a_minute_per_address()
    {
        await using var factory = WithMailpit();
        var client = factory.CreateClient();
        var username = $"flood_{Guid.NewGuid():N}"[..20];
        var email = $"{username}@example.com";
        (await client.PostAsJsonAsync("/api/v1/auth/register", new { email, password = "Passw0rdX", username, displayName = "Flood" })).EnsureSuccessStatusCode();

        for (var i = 0; i < 4; i++)
            Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { email })).StatusCode);

        await WaitForMessageToAsync(email);
        await Task.Delay(1500); // a second email, if one were going to be sent, would be here by now
        var list = await _mailApi.GetFromJsonAsync<JsonElement>($"/api/v1/search?query={Uri.EscapeDataString($"to:{email}")}");
        Assert.Equal(1, list.GetProperty("messages").GetArrayLength());
    }

    [Fact]
    public async Task Forgot_password_does_not_wait_for_the_mail_server()
    {
        // Nothing listens on port 1, so the send fails, but the answer comes back at once: the email is sent after it, so the
        // response time says nothing about whether the address has an account.
        await using var factory = WithSmtp("127.0.0.1", 1);
        var client = factory.CreateClient();
        var known = await Timed(client, TechRatFactory.AdminEmail);
        var unknown = await Timed(client, $"nobody_{Guid.NewGuid():N}@example.com");

        Assert.True(Math.Abs(known.TotalMilliseconds - unknown.TotalMilliseconds) < 1500, $"known {known.TotalMilliseconds:0} ms, unknown {unknown.TotalMilliseconds:0} ms");

        static async Task<TimeSpan> Timed(HttpClient c, string email)
        {
            var start = System.Diagnostics.Stopwatch.GetTimestamp();
            Assert.Equal(HttpStatusCode.Accepted, (await c.PostAsJsonAsync("/api/v1/auth/forgot-password", new { email })).StatusCode);
            return System.Diagnostics.Stopwatch.GetElapsedTime(start);
        }
    }

    [Fact]
    public async Task Forgot_password_answers_the_same_way_when_the_smtp_server_is_down()
    {
        // Nothing listens on port 1: the send fails, but the response must not reveal that the account exists.
        await using var factory = WithSmtp("127.0.0.1", 1);
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { email = TechRatFactory.AdminEmail })).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { email = "nobody@example.com" })).StatusCode);
    }

    [Fact]
    public async Task Test_email_reports_missing_configuration_and_is_admin_only()
    {
        var (learner, _) = await api.CreateUserAsync();
        Assert.Equal(HttpStatusCode.Forbidden, (await learner.PostAsJsonAsync("/api/v1/admin/email/test", new { })).StatusCode);

        var admin = api.CreateClient(); // the shared test host has no SMTP configured
        await TechRatFactory.LoginAsync(admin, TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);
        var res = await admin.PostAsJsonAsync("/api/v1/admin/email/test", new { });
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);

        await using var down = WithSmtp("127.0.0.1", 1);
        var downAdmin = down.CreateClient();
        await TechRatFactory.LoginAsync(downAdmin, TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);
        var failed = await downAdmin.PostAsJsonAsync("/api/v1/admin/email/test", new { });
        Assert.Equal(HttpStatusCode.BadGateway, failed.StatusCode);
        // The admin needs the provider's reason (e.g. "domain not verified") to fix the settings.
        var problem = await failed.Content.ReadFromJsonAsync<JsonElement>();
        Assert.StartsWith("The email could not be sent: ", problem.GetProperty("detail").GetString());
    }
}
