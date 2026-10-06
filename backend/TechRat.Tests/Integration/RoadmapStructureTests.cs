using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Domain.Common;
using TechRat.Domain.Roadmaps;
using TechRat.Infrastructure.Seed;

namespace TechRat.Tests.Integration;

/// <summary>
/// Roadmaps are the structured path: modules from easier to harder levels (capstone last) and, inside each module,
/// steps that ramp up in difficulty. The seed applies it to existing databases too.
/// </summary>
[Collection(ApiCollection.Name)]
public class RoadmapStructureTests(TechRatFactory api)
{
    [Fact]
    public async Task Every_roadmap_goes_from_easier_to_harder_modules_with_the_capstone_last()
    {
        var paths = await api.WithDbAsync(db => db.Roadmaps.AsNoTracking()
            .Select(r => new { r.Slug, Modules = r.Links.OrderBy(l => l.Order).Select(l => new { l.Module!.Level, l.Module.Kind }).ToList() })
            .ToListAsync());
        Assert.NotEmpty(paths);
        foreach (var r in paths)
        {
            var levels = r.Modules.Where(m => m.Kind != ModuleKind.Capstone).Select(m => m.Level).ToList();
            Assert.True(levels.SequenceEqual(levels.Order()), $"{r.Slug}: {string.Join(", ", levels)}");
            var capstone = r.Modules.FindIndex(m => m.Kind == ModuleKind.Capstone);
            Assert.True(capstone == -1 || capstone == r.Modules.Count - 1, $"{r.Slug}: capstone at {capstone}");
        }
    }

    [Fact]
    public async Task Steps_inside_every_module_ramp_up_in_difficulty()
    {
        var modules = await api.WithDbAsync(db => db.LearningModules.AsNoTracking()
            .Select(m => new { m.Slug, m.Level, Steps = m.Steps.Where(s => s.IsActive).OrderBy(s => s.Order).Select(s => s.Difficulty).ToList() })
            .ToListAsync());
        foreach (var m in modules)
        {
            var steps = m.Steps.ToList();
            Assert.True(steps.SequenceEqual(steps.Order()), $"{m.Slug}: {string.Join(", ", steps)}");
        }
        var beginnerWithSeveralSteps = modules.First(m => m.Level == RoadmapDifficulty.Beginner && m.Steps.Count >= 2);
        Assert.Equal(Difficulty.Easy, beginnerWithSeveralSteps.Steps[0]);
        Assert.Equal(Difficulty.Medium, beginnerWithSeveralSteps.Steps[^1]);
    }

    [Fact]
    public async Task Seeding_restores_the_structured_order_on_an_existing_database()
    {
        // An older database with the modules of a roadmap in reverse order and flat step difficulties.
        const string slug = "data-structures-and-algorithms";
        var expected = await api.WithDbAsync(async db =>
        {
            var roadmap = await db.Roadmaps.Include(r => r.Links).SingleAsync(r => r.Slug == slug);
            var order = roadmap.Links.OrderBy(l => l.Order).Select(l => l.ModuleId).ToList();
            var reversed = roadmap.Links.OrderByDescending(l => l.Order).Select((l, i) => (l.ModuleId, l.IsRequired, Order: i + 1)).ToList();
            db.RoadmapModuleLinks.RemoveRange(roadmap.Links);
            await db.SaveChangesAsync();
            foreach (var (moduleId, required, o) in reversed)
                db.RoadmapModuleLinks.Add(new() { RoadmapId = roadmap.Id, ModuleId = moduleId, IsRequired = required, Order = o });
            await db.ModuleSteps.ExecuteUpdateAsync(s => s.SetProperty(x => x.Difficulty, Difficulty.Expert));
            await db.SaveChangesAsync();
            return order;
        });

        using (var scope = api.Services.CreateScope())
        {
            var report = await scope.ServiceProvider.GetRequiredService<DatabaseSeeder>().SeedAsync();
            Assert.Equal(1, report.CompositionsChanged);
        }

        var (actual, flat) = await api.WithDbAsync(async db =>
        {
            var roadmapId = await db.Roadmaps.Where(r => r.Slug == slug).Select(r => r.Id).SingleAsync();
            var beginner = db.LearningModules.Where(m => m.Level == RoadmapDifficulty.Beginner).Select(m => m.Id);
            return (
                await db.RoadmapModuleLinks.Where(l => l.RoadmapId == roadmapId).OrderBy(l => l.Order).Select(l => l.ModuleId).ToListAsync(),
                await db.ModuleSteps.CountAsync(s => s.IsActive && s.Order == 1 && beginner.Contains(s.ModuleId) && s.Difficulty == Difficulty.Expert));
        });
        Assert.Equal(expected, actual);
        Assert.Equal(0, flat);
    }
}
