using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace TechRat.Tests.Integration;

/// <summary>
/// Production runs behind Apache and the Next.js proxy, so every request reaches the API from a proxy address.
/// With ReverseProxy:Enabled the API takes the client address from X-Forwarded-For (trusted proxies only), which keeps
/// per-client limits per client instead of shared by everyone.
/// </summary>
[Collection(ApiCollection.Name)]
public class ReverseProxyTests(TechRatFactory api)
{
    private WebApplicationFactory<Program> Behind(bool proxyEnabled) => api.WithWebHostBuilder(b =>
    {
        b.UseSetting("RateLimiting:AuthPerMinute", "2");
        b.UseSetting("ReverseProxy:Enabled", proxyEnabled ? "true" : "false");
    });

    private static async Task<HttpStatusCode> LoginFromAsync(HttpClient client, string clientIp)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
        {
            Content = JsonContent.Create(new { email = "nobody@example.com", password = "Wrong1234" }),
        };
        req.Headers.Add("X-Forwarded-For", clientIp);
        return (await client.SendAsync(req)).StatusCode;
    }

    [Fact]
    public async Task Behind_the_proxy_the_auth_rate_limit_applies_per_client()
    {
        await using var factory = Behind(proxyEnabled: true);
        var client = factory.CreateClient();

        // Different clients never consume each other's quota.
        foreach (var ip in new[] { "203.0.113.10", "203.0.113.11", "203.0.113.12", "203.0.113.13" })
            Assert.Equal(HttpStatusCode.Unauthorized, await LoginFromAsync(client, ip));

        // The same client is still limited.
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginFromAsync(client, "198.51.100.7"));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginFromAsync(client, "198.51.100.7"));
        Assert.Equal(HttpStatusCode.TooManyRequests, await LoginFromAsync(client, "198.51.100.7"));
    }

    [Fact]
    public async Task Without_the_proxy_setting_forwarded_headers_are_ignored()
    {
        // Otherwise anyone could pick a new X-Forwarded-For per request and bypass the limit.
        await using var factory = Behind(proxyEnabled: false);
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginFromAsync(client, "203.0.113.20"));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginFromAsync(client, "203.0.113.21"));
        Assert.Equal(HttpStatusCode.TooManyRequests, await LoginFromAsync(client, "203.0.113.22"));
    }
}
