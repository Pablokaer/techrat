using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TechRat.Infrastructure.Persistence;

/// <summary>Used only by `dotnet ef` to create migrations (no database connection is needed for that).</summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("TECHRAT_DESIGN_CONNECTION")
            ?? "Host=localhost;Database=techrat_design;Username=techrat;Password=design";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connection, o => o.MigrationsHistoryTable("__ef_migrations_history", "infrastructure"))
            .UseSnakeCaseNamingConvention()
            .Options;
        return new AppDbContext(options);
    }
}
