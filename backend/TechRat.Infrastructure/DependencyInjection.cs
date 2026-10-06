using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TechRat.Application.Common;
using TechRat.Application.Identity;
using TechRat.Infrastructure.Caching;
using TechRat.Infrastructure.Email;
using TechRat.Infrastructure.Outbox;
using TechRat.Infrastructure.Persistence;
using TechRat.Infrastructure.Seed;

namespace TechRat.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres is not configured.");

        services.AddDbContext<AppDbContext>(o => o
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history", "infrastructure"))
            .UseSnakeCaseNamingConvention());
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        var redis = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redis))
            services.AddStackExchangeRedisCache(o => { o.Configuration = redis; o.InstanceName = "techrat:"; });
        else
            services.AddDistributedMemoryCache();
        services.AddSingleton<ICacheService, DistributedCacheService>();

        services.AddSingleton<OutboxSignal>();
        services.AddSingleton<IOutboxSignal>(sp => sp.GetRequiredService<OutboxSignal>());
        services.AddSingleton<OutboxDispatcher>();
        if (configuration.GetValue("Outbox:Enabled", true))
            services.AddHostedService(sp => sp.GetRequiredService<OutboxDispatcher>());

        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.Section));
        services.AddSingleton<IEmailSender<ApplicationUser>, IdentityEmailSender>();
        services.AddScoped<DatabaseSeeder>();
        return services;
    }

    /// <summary>Applies migrations and runs the idempotent seed under a PostgreSQL advisory lock (safe with multiple instances).</summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services, bool seed, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseInitializer");

        await db.Database.OpenConnectionAsync(ct);
        try
        {
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_lock(7428301)", ct);
            var pending = (await db.Database.GetPendingMigrationsAsync(ct)).ToList();
            if (pending.Count > 0)
            {
                logger.LogInformation("Applying {Count} migration(s): {Migrations}", pending.Count, string.Join(", ", pending));
                await db.Database.MigrateAsync(ct);
            }
            if (seed) await scope.ServiceProvider.GetRequiredService<DatabaseSeeder>().SeedAsync(ct);
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_unlock(7428301)", ct);
            await db.Database.CloseConnectionAsync();
        }
    }
}
