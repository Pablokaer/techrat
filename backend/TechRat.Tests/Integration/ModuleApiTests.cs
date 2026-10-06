using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TechRat.Application.Administration;
using TechRat.Application.Catalog;
using TechRat.Application.Roadmaps;

namespace TechRat.Tests.Integration;

[Collection(ApiCollection.Name)]
public class ModuleApiTests(TechRatFactory api)
{
    private async Task<HttpClient> AdminAsync()
    {
        var admin = api.CreateClient();
        await TechRatFactory.LoginAsync(admin, TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);
        return admin;
    }

    [Fact]
    public async Task Module_catalog_lists_published_modules_with_kind_filter()
    {
        var all = await api.CreateClient().GetFromJsonAsync<List<ModuleSummaryDto>>("/api/v1/modules", TechRatFactory.Json);
        Assert.Contains(all!, m => m.Slug == "sql-foundations" && m.Kind == "Core" && m.UsedInRoadmaps.Count >= 2);
        Assert.DoesNotContain(all!, m => m.Slug.StartsWith("legacy-"));

        var context = await api.CreateClient().GetFromJsonAsync<List<ModuleSummaryDto>>("/api/v1/modules?kind=Context", TechRatFactory.Json);
        Assert.NotEmpty(context!);
        Assert.All(context!, m => Assert.Equal("Context", m.Kind));
    }

    [Fact]
    public async Task Module_detail_is_localized_and_lists_its_roadmaps()
    {
        var client = api.CreateClient();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("pt-BR");
        var detail = await client.GetFromJsonAsync<ModuleDetailDto>("/api/v1/modules/sql-foundations", TechRatFactory.Json);
        Assert.Equal("sql-foundations", detail!.Summary.Slug);
        Assert.NotEqual("SQL Foundations", detail.Summary.Name);
        Assert.NotEmpty(detail.Steps);
        Assert.Contains(detail.Summary.UsedInRoadmaps, r => r.Slug == "backend-developer");
        Assert.Equal(404, (int)(await client.GetAsync("/api/v1/modules/nope")).StatusCode);
    }

    [Fact]
    public async Task Practicing_a_module_step_outside_any_roadmap_starts_the_module_and_credits_the_step()
    {
        var (client, _) = await api.CreateUserAsync();
        var detail = await client.GetFromJsonAsync<ModuleDetailDto>("/api/v1/modules/git-essentials", TechRatFactory.Json);
        var first = detail!.Steps[0];
        Assert.Equal(StepStatus.Current, first.Status);

        var s = await Practice.StartAsync(client, new { mode = "Roadmap", roadmapStepId = first.Id, count = first.MinimumQuestions });
        CompletedStepDto? completed = null;
        foreach (var q in s.Questions.Take(first.MinimumQuestions))
            completed ??= (await Practice.AnswerAsync(api, client, s, q, true)).CompletedSteps.FirstOrDefault(c => c.StepId == first.Id);
        Assert.NotNull(completed);
        Assert.Equal("git-essentials", completed!.ModuleSlug);

        var after = await client.GetFromJsonAsync<ModuleDetailDto>("/api/v1/modules/git-essentials", TechRatFactory.Json);
        Assert.Equal(StepStatus.Completed, after!.Steps[0].Status);
        Assert.True(after.Summary.Progress!.IsStarted);
        Assert.Equal(1, after.Summary.Progress.CompletedSteps);
    }

    [Fact]
    public async Task Search_includes_modules()
    {
        var results = await api.CreateClient().GetFromJsonAsync<List<SearchResultDto>>("/api/v1/search?q=sql foundations", TechRatFactory.Json);
        Assert.Contains(results!, r => r.Type == "Module" && r.Slug == "sql-foundations" && r.Url == "/modules/sql-foundations");
    }

    [Fact]
    public async Task Learners_cannot_edit_modules_or_compositions()
    {
        var (learner, _) = await api.CreateUserAsync();
        Assert.Equal(HttpStatusCode.Forbidden, (await learner.GetAsync("/api/v1/admin/modules")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await learner.PostAsJsonAsync("/api/v1/admin/modules",
            new { slug = "x-mod", name = "X", description = "", kind = "Context", category = "", level = "Beginner", icon = "layers", isPublished = true, isStandalone = true, xpReward = 100 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await learner.PostAsJsonAsync("/api/v1/admin/roadmaps/git-and-collaboration/modules", new { moduleSlug = "sql-foundations" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await learner.PutAsJsonAsync("/api/v1/admin/roadmaps/git-and-collaboration/modules", new { modules = Array.Empty<object>() })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await learner.DeleteAsync("/api/v1/admin/roadmaps/git-and-collaboration/modules/git-essentials")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateClient().GetAsync("/api/v1/admin/modules")).StatusCode);
    }

    [Fact]
    public async Task Admins_create_modules_and_compose_roadmaps()
    {
        var admin = await AdminAsync();
        var suffix = Guid.NewGuid().ToString("N")[..6];
        var roadmapSlug = $"t-admin-path-{suffix}";
        var moduleSlug = $"t-admin-module-{suffix}";
        (await admin.PostAsJsonAsync("/api/v1/admin/roadmaps", new
        {
            slug = roadmapSlug, name = "Admin path", description = "", category = "Tools", difficulty = "Beginner", estimatedHours = 2,
            icon = "map", isPublished = true, xpReward = 1000,
        })).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync("/api/v1/admin/modules", new
        {
            slug = moduleSlug, name = "Admin module", description = "Made by an admin.", kind = "Context", category = "Tools", level = "Beginner",
            icon = "layers", isPublished = true, isStandalone = false, xpReward = 150,
        })).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync($"/api/v1/admin/modules/{moduleSlug}/steps", new
        {
            title = "Git basics", description = "", difficulty = "Easy", estimatedMinutes = 30, topicSlug = "git", subtopicSlug = "basics",
            minimumQuestions = 3, minimumAccuracy = 70, xpReward = 50,
        })).EnsureSuccessStatusCode();

        // Compose: [git-essentials, admin module (optional)], then reorder and make it required, then remove.
        (await admin.PostAsJsonAsync($"/api/v1/admin/roadmaps/{roadmapSlug}/modules", new { moduleSlug = "git-essentials" })).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync($"/api/v1/admin/roadmaps/{roadmapSlug}/modules", new { moduleSlug, isRequired = false })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/roadmaps/{roadmapSlug}/modules", new { moduleSlug })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/v1/admin/roadmaps/{roadmapSlug}/modules", new { moduleSlug = "nope" })).StatusCode);

        var composition = await admin.GetFromJsonAsync<AdminCompositionDto>($"/api/v1/admin/roadmaps/{roadmapSlug}/modules", TechRatFactory.Json);
        Assert.False(composition!.SeedManaged);
        Assert.Equal(["git-essentials", moduleSlug], composition.Modules.Select(m => m.ModuleSlug));
        Assert.False(composition.Modules[1].IsRequired);

        (await admin.PutAsJsonAsync($"/api/v1/admin/roadmaps/{roadmapSlug}/modules", new
        {
            modules = new object[] { new { moduleSlug, isRequired = true }, new { moduleSlug = "git-essentials", isRequired = true } },
        })).EnsureSuccessStatusCode();
        composition = await admin.GetFromJsonAsync<AdminCompositionDto>($"/api/v1/admin/roadmaps/{roadmapSlug}/modules", TechRatFactory.Json);
        Assert.Equal([moduleSlug, "git-essentials"], composition!.Modules.Select(m => m.ModuleSlug));
        Assert.All(composition.Modules, m => Assert.True(m.IsRequired));

        var gitSteps = composition.Modules[1].Steps;
        var stepsCount = await api.WithDbAsync(db => db.Roadmaps.Where(r => r.Slug == roadmapSlug).Select(r => r.StepsCount).SingleAsync());
        Assert.Equal(1 + gitSteps, stepsCount);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/v1/admin/roadmaps/{roadmapSlug}/modules/git-essentials")).StatusCode);
        var detail = await admin.GetFromJsonAsync<RoadmapDetailDto>($"/api/v1/roadmaps/{roadmapSlug}", TechRatFactory.Json);
        Assert.Equal([moduleSlug], detail!.Modules.Select(m => m.ModuleSlug));

        var module = await admin.GetFromJsonAsync<AdminModuleDto>($"/api/v1/admin/modules/{moduleSlug}", TechRatFactory.Json);
        Assert.Equal([roadmapSlug], module!.UsedInRoadmaps);
        Assert.Single(module.Steps);
    }
}
