using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Common;
using TechRat.Application.Roadmaps;
using TechRat.Domain.Common;
using TechRat.Domain.Roadmaps;

namespace TechRat.Tests.Integration;

/// <summary>
/// The roadmap page and the module page show the same steps; for the same learner they must agree on every step
/// (status, "new content", criteria and texts) whenever the module is open in the roadmap.
/// </summary>
[Collection(ApiCollection.Name)]
public class StepViewTests(TechRatFactory api)
{
    private sealed record Fixture(string Roadmap, string First, string Second, Guid FirstModuleId, Guid FirstStepId);

    /// <summary>A roadmap [first, second] of two one-step modules over real scopes with enough questions.</summary>
    private async Task<Fixture> CreateRoadmapAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var fixture = await api.WithDbAsync(async db =>
        {
            var scopes = await db.Questions.Where(q => q.IsActive).GroupBy(q => new { q.TopicId, q.SubtopicId })
                .Where(g => g.Count() >= 3).Select(g => g.Key).OrderBy(k => k.TopicId).ThenBy(k => k.SubtopicId).Take(2).ToListAsync();
            ModuleStep Step(Guid moduleId, int i) => new()
            {
                ModuleId = moduleId, Order = 1, Title = $"Step {i}", Difficulty = Difficulty.Easy, EstimatedMinutes = 30,
                TopicId = scopes[i].TopicId, SubtopicId = scopes[i].SubtopicId, MinimumQuestions = 3, MinimumAccuracy = 70, XPReward = 50,
            };
            // Test fixtures use the "t-" slug prefix (excluded from catalog coverage checks). They are not Beginner modules:
            // RoadmapStructureTests checks the seeded difficulty of every Beginner module's first step in the shared database,
            // and the seeder never touches fixtures, so a Beginner fixture would count as unstructured content there.
            var first = new LearningModule { Slug = $"t-view-a-{suffix}", Name = "First", Kind = ModuleKind.Core, Level = RoadmapDifficulty.Intermediate, XPReward = 150 };
            var second = new LearningModule { Slug = $"t-view-b-{suffix}", Name = "Second", Kind = ModuleKind.Core, Level = RoadmapDifficulty.Intermediate, XPReward = 150 };
            first.Steps.Add(Step(first.Id, 0));
            second.Steps.Add(Step(second.Id, 1));
            var roadmap = new Roadmap { Slug = $"t-view-{suffix}", Name = "View", XPReward = 1000, StepsCount = 2, DisplayOrder = 950 };
            roadmap.Links.Add(new RoadmapModuleLink { RoadmapId = roadmap.Id, ModuleId = first.Id, Order = 1 });
            roadmap.Links.Add(new RoadmapModuleLink { RoadmapId = roadmap.Id, ModuleId = second.Id, Order = 2 });
            db.AddRange(first, second, roadmap);
            await db.SaveChangesAsync();
            return new Fixture(roadmap.Slug, first.Slug, second.Slug, first.Id, first.Steps[0].Id);
        });
        await ClearRoadmapCatalogAsync();
        return fixture;
    }

    private async Task ClearRoadmapCatalogAsync()
    {
        using var scope = api.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<ICacheService>().RemoveAsync(CacheEntries.Roadmaps);
    }

    /// <summary>New content: a second step added to the first module after learners completed version 1.</summary>
    private Task<Guid> AddStepToFirstModuleAsync(Fixture f) =>
        api.WithDbAsync(async db =>
        {
            var scope = await db.Questions.Where(q => q.IsActive).GroupBy(q => new { q.TopicId, q.SubtopicId })
                .Where(g => g.Count() >= 3).Select(g => g.Key).OrderBy(k => k.TopicId).ThenBy(k => k.SubtopicId).Skip(2).FirstAsync();
            var module = await db.LearningModules.SingleAsync(m => m.Id == f.FirstModuleId);
            module.Version = 2;
            var step = new ModuleStep
            {
                ModuleId = module.Id, Order = 2, Title = "Added later", Difficulty = Difficulty.Medium, EstimatedMinutes = 30,
                TopicId = scope.TopicId, SubtopicId = scope.SubtopicId, MinimumQuestions = 3, MinimumAccuracy = 70, XPReward = 50, AddedInVersion = 2,
            };
            db.ModuleSteps.Add(step);
            await db.SaveChangesAsync();
            return step.Id;
        });

    private async Task PassStepAsync(HttpClient client, Guid stepId)
    {
        var s = await Practice.StartAsync(client, new { mode = "Roadmap", roadmapStepId = stepId, count = 3 });
        foreach (var q in s.Questions.Take(3)) await Practice.AnswerAsync(api, client, s, q, true);
    }

    /// <summary>Asserts both pages report identical steps for each module and returns the roadmap page.</summary>
    private static async Task<RoadmapDetailDto> AssertPagesAgreeAsync(HttpClient client, Fixture f, params string[] moduleSlugs)
    {
        var roadmap = (await client.GetFromJsonAsync<RoadmapDetailDto>($"/api/v1/roadmaps/{f.Roadmap}", TechRatFactory.Json))!;
        foreach (var slug in moduleSlugs)
        {
            var module = (await client.GetFromJsonAsync<ModuleDetailDto>($"/api/v1/modules/{slug}", TechRatFactory.Json))!;
            var inRoadmap = roadmap.Modules.Single(m => m.ModuleSlug == slug).Steps;
            Assert.Equal(module.Steps.Select(s => (s.Id, s.Status, s.IsNew)), inRoadmap.Select(s => (s.Id, s.Status, s.IsNew)));
            Assert.Equal(module.Steps, inRoadmap); // texts, criteria and every other field too
        }
        return roadmap;
    }

    [Fact]
    public async Task A_learner_sees_the_same_steps_on_the_roadmap_and_module_pages_including_new_content()
    {
        var f = await CreateRoadmapAsync();
        var (client, _) = await api.CreateUserAsync();
        (await client.PostAsync($"/api/v1/roadmaps/{f.Roadmap}/start", null)).EnsureSuccessStatusCode();

        // Before any progress: the first module is open in the roadmap.
        var start = await AssertPagesAgreeAsync(client, f, f.First);
        Assert.Equal(StepStatus.Current, start.Modules[0].Steps[0].Status);

        // The learner completes the first module (version 1); then a step is added to it.
        await PassStepAsync(client, f.FirstStepId);
        var addedId = await AddStepToFirstModuleAsync(f);

        var roadmap = await AssertPagesAgreeAsync(client, f, f.First, f.Second);
        var first = roadmap.Modules[0];
        Assert.True(first.IsCompleted); // new content never revokes a completion
        Assert.Equal(StepStatus.Completed, first.Steps[0].Status);
        Assert.False(first.Steps[0].IsNew);
        var added = first.Steps.Single(s => s.Id == addedId);
        Assert.True(added.IsNew);
        Assert.Equal(StepStatus.Current, added.Status); // the learner can still work on it, on either page
        Assert.Equal(StepStatus.Current, roadmap.Modules[1].Steps[0].Status);
    }

    [Fact]
    public async Task An_administrator_sees_the_same_open_steps_on_the_roadmap_and_module_pages()
    {
        var f = await CreateRoadmapAsync();
        var admin = api.CreateClient();
        await TechRatFactory.LoginAsync(admin, TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);
        await AddStepToFirstModuleAsync(f);

        var roadmap = await AssertPagesAgreeAsync(admin, f, f.First, f.Second);
        Assert.All(roadmap.Modules.SelectMany(m => m.Steps), s => Assert.Equal(StepStatus.Current, s.Status));
        Assert.All(roadmap.Modules.SelectMany(m => m.Steps), s => Assert.False(s.IsNew)); // nothing completed, nothing new
    }
}
