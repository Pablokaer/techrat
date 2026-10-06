using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
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
