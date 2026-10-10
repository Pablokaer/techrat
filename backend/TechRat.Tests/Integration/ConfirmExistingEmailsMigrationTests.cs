using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using TechRat.Infrastructure.Persistence;

namespace TechRat.Tests.Integration;

/// <summary>
/// Sign-in now needs a confirmed email (ADR-0031). Accounts created before that never had to confirm, so the migration marks
/// them confirmed; otherwise everybody who already uses the platform would be locked out the moment it deploys.
/// </summary>
[Collection(ApiCollection.Name)]
public class ConfirmExistingEmailsMigrationTests(TechRatFactory api)
{
    [Fact]
    public async Task Accounts_that_existed_before_confirmation_was_required_are_marked_confirmed()
    {
        var dbName = $"techrat_migration_{Guid.NewGuid():N}";
        await using (var conn = new NpgsqlConnection(api.ConnectionString))
        {
            await conn.OpenAsync();
            await new NpgsqlCommand($"CREATE DATABASE {dbName}", conn).ExecuteNonQueryAsync();
        }
        var cs = new NpgsqlConnectionStringBuilder(api.ConnectionString) { Database = dbName }.ConnectionString;
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(cs, o => o.MigrationsHistoryTable("__ef_migrations_history", "infrastructure")).UseSnakeCaseNamingConvention().Options;
        await using var db = new AppDbContext(options);
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20261006221011_AddUserShowOnLeaderboard");

        Guid unconfirmed = Guid.NewGuid(), confirmed = Guid.NewGuid();
        // Test data only: both values are Guids generated above.
#pragma warning disable EF1002
        await db.Database.ExecuteSqlRawAsync($"""
            INSERT INTO identity.users (id, user_name, email, email_confirmed, phone_number_confirmed, two_factor_enabled, lockout_enabled, access_failed_count)
            VALUES ('{unconfirmed}', 'before', 'before@example.com', false, false, false, false, 0),
                   ('{confirmed}', 'admin', 'admin@example.com', true, false, false, false, 0);
            """);
#pragma warning restore EF1002

        await migrator.MigrateAsync();

        var states = await db.Database.SqlQuery<bool>($"SELECT email_confirmed AS \"Value\" FROM identity.users WHERE id IN ({unconfirmed}, {confirmed})").ToListAsync();
        Assert.Equal(2, states.Count);
        Assert.All(states, Assert.True);
    }
}
