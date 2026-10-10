using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Infrastructure.Outbox;
using TechRat.Infrastructure.Persistence;
using Testcontainers.PostgreSql;

namespace TechRat.Tests.Integration;

/// <summary>
/// Boots the real API against a real PostgreSQL (Testcontainers). Set TECHRAT_TEST_POSTGRES to reuse an
/// existing server instead of starting a container.
/// </summary>
public sealed class TechRatFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminEmail = "admin@techrat.test";
    public const string AdminPassword = "Orchard-Lantern-Zebra-7";

    private PostgreSqlContainer? _container;
    private string _connectionString = "";

    /// <summary>Connection string of the test database server (used to create extra databases, e.g. for migration tests).</summary>
    public string ConnectionString => _connectionString;

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    public async Task InitializeAsync()
    {
        var external = Environment.GetEnvironmentVariable("TECHRAT_TEST_POSTGRES");
        if (!string.IsNullOrWhiteSpace(external))
        {
            var db = $"techrat_test_{Guid.NewGuid():N}";
            await using (var conn = new Npgsql.NpgsqlConnection(external))
            {
                await conn.OpenAsync();
                await using var cmd = new Npgsql.NpgsqlCommand($"CREATE DATABASE {db}", conn);
                await cmd.ExecuteNonQueryAsync();
            }
            _connectionString = new Npgsql.NpgsqlConnectionStringBuilder(external) { Database = db }.ConnectionString;
        }
        else
        {
            _container = new PostgreSqlBuilder("postgres:17-alpine").Build();
            await _container.StartAsync();
            _connectionString = _container.GetConnectionString();
        }
        // Force host start (runs migrations + seed).
        _ = Server;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Postgres", _connectionString);
        builder.UseSetting("ConnectionStrings:Redis", "");
        builder.UseSetting("Database:MigrateOnStartup", "true");
        builder.UseSetting("Database:SeedOnStartup", "true");
        builder.UseSetting("Seed:AdminEmail", AdminEmail);
        builder.UseSetting("Seed:AdminPassword", AdminPassword);
        builder.UseSetting("RateLimiting:AuthPerMinute", "10000");
        builder.UseSetting("RateLimiting:AnswersPerMinute", "10000");
        builder.UseSetting("RateLimiting:UploadsPerMinute", "10000");
        builder.UseSetting("Outbox:Enabled", "false"); // tests drive the dispatcher explicitly for determinism
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        if (_container is not null) await _container.DisposeAsync();
    }

    public async Task<T> WithDbAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        using var scope = Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    public Task WithDbAsync(Func<AppDbContext, Task> action) => WithDbAsync(async db => { await action(db); return true; });

    public async Task DrainOutboxAsync()
    {
        var dispatcher = Services.GetRequiredService<OutboxDispatcher>();
        while (await dispatcher.DispatchBatchAsync(CancellationToken.None) > 0) { }
    }

    /// <summary>Registers a fresh user and returns a client authenticated with a bearer token.</summary>
    public async Task<(HttpClient Client, string Username)> CreateUserAsync(string? prefix = null)
    {
        var username = $"{prefix ?? "u"}_{Guid.NewGuid():N}"[..20];
        var client = CreateClient();
        var email = $"{username}@example.com";
        var register = await client.PostAsJsonAsync("/api/v1/auth/register", new { email, password = "Passw0rdX", username, displayName = "Test User" });
        register.EnsureSuccessStatusCode();
        await LoginAsync(client, email, "Passw0rdX");
        return (client, username);
    }

    public static async Task<JsonElement> LoginAsync(HttpClient client, string email, string password)
    {
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("accessToken").GetString());
        return body;
    }

    /// <summary>Correct (or a wrong) option for a question, read straight from the database.</summary>
    public Task<Guid> OptionAsync(Guid questionId, bool correct) =>
        WithDbAsync(db => db.QuestionOptions.Where(o => o.QuestionId == questionId && o.IsCorrect == correct).Select(o => o.Id).FirstAsync());

    public Task<Guid> UserIdAsync(string username) =>
        WithDbAsync(db => db.UserProfiles.Where(u => u.Username == username).Select(u => u.Id).FirstAsync());
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<TechRatFactory>
{
    public const string Name = "api";
}
