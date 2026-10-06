using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Roadmaps;
using TechRat.Infrastructure.Seed;

namespace TechRat.Tests.Integration;

/// <summary>
/// The platform's top roadmaps for junior developers come from the seed (roadmaps.py JUNIOR_TOP) and reach clients as
/// <see cref="RoadmapSummaryDto.JuniorRank"/>, which drives the "Recommended for juniors" filter.
/// </summary>
[Collection(ApiCollection.Name)]
public class JuniorRecommendationTests(TechRatFactory api)
{
    private static readonly string[] JuniorTop =
    [
        "junior-software-engineer", "computer-science-fundamentals", "git-and-collaboration",
        "javascript-developer", "sql", "data-structures-and-algorithms",
    ];

    [Fact]
    public async Task The_roadmap_list_ranks_the_six_roadmaps_recommended_for_juniors()
    {
        var list = await api.CreateClient().GetFromJsonAsync<List<RoadmapSummaryDto>>("/api/v1/roadmaps", TechRatFactory.Json);

        var ranked = list!.Where(r => r.JuniorRank is not null).OrderBy(r => r.JuniorRank).ToList();
        Assert.Equal(JuniorTop, ranked.Select(r => r.Slug));
        Assert.Equal([1, 2, 3, 4, 5, 6], ranked.Select(r => r.JuniorRank!.Value));
    }

    [Fact]
    public async Task The_junior_path_offers_the_beginner_modules_of_the_other_junior_roadmaps_as_optional()
    {
        var optional = await api.WithDbAsync(db => db.RoadmapModuleLinks.AsNoTracking()
            .Where(l => !l.IsRequired && db.Roadmaps.Any(r => r.Id == l.RoadmapId && r.Slug == "junior-software-engineer"))
            .Select(l => l.Module!.Slug).ToListAsync());

        Assert.Equal(["git-collaboration", "how-computers-work", "javascript-core", "linear-data-structures"], optional.Order());
    }

    [Fact]
    public async Task Seeding_restores_the_junior_ranks_on_an_existing_database()
    {
        await api.WithDbAsync(db => db.Roadmaps.ExecuteUpdateAsync(s => s.SetProperty(r => r.JuniorRank, (int?)null)));

        using (var scope = api.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<DatabaseSeeder>().SeedAsync();

        var ranked = await api.WithDbAsync(db => db.Roadmaps.AsNoTracking().Where(r => r.JuniorRank != null)
            .OrderBy(r => r.JuniorRank).Select(r => r.Slug).ToListAsync());
        Assert.Equal(JuniorTop, ranked);
    }
}
