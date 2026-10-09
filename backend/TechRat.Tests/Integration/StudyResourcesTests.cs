using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Resources;

namespace TechRat.Tests.Integration;

/// <summary>
/// "Study resources": the recommended reading of each roadmap (overview) and module (topics, each with sources),
/// curated in Seed/Data/resources.json (ADR-0020) and served in the request language.
/// </summary>
[Collection(ApiCollection.Name)]
public class StudyResourcesTests(TechRatFactory api)
{
    private static HttpClient Portuguese(HttpClient client)
    {
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("pt-BR");
        return client;
    }

    [Fact]
    public async Task A_roadmap_lists_its_overview_sources()
    {
        var res = await api.CreateClient().GetFromJsonAsync<RoadmapResourcesDto>("/api/v1/roadmaps/git-and-collaboration/resources", TechRatFactory.Json);

        Assert.NotEmpty(res!.Sources);
        Assert.Contains(res.Sources, s => s.Type == "book" && s.Url == "https://git-scm.com/book/en/v2");
        Assert.All(res.Sources, s =>
        {
            Assert.StartsWith("https://", s.Url);
            Assert.Contains(s.Type, new[] { "official-docs", "article", "book", "course", "video", "spec" });
            Assert.Contains(s.Language, new[] { "en", "pt-BR" });
        });
    }

    [Fact]
    public async Task A_module_lists_topics_to_master_each_with_sources()
    {
        var res = await api.CreateClient().GetFromJsonAsync<ModuleResourcesDto>("/api/v1/modules/git-essentials/resources", TechRatFactory.Json);

        Assert.Equal(["Repositories and commits", "Reading the history", "Branches and merging"], res!.Topics.Select(t => t.Name));
        Assert.All(res.Topics, t => Assert.NotEmpty(t.Sources));
        Assert.Contains(res.Topics[0].Sources, s => s.Url == "https://git-scm.com/docs/gitignore" && s.Type == "official-docs");
    }

    [Fact]
    public async Task Topic_names_and_notes_follow_the_request_language()
    {
        var en = await api.CreateClient().GetFromJsonAsync<ModuleResourcesDto>("/api/v1/modules/git-essentials/resources", TechRatFactory.Json);
        var pt = await Portuguese(api.CreateClient()).GetFromJsonAsync<ModuleResourcesDto>("/api/v1/modules/git-essentials/resources", TechRatFactory.Json);

        Assert.Equal("Repositórios e commits", pt!.Topics[0].Name);
        var enNote = en!.Topics[0].Sources.First(s => s.Url.EndsWith("gitignore", StringComparison.Ordinal)).Note;
        var ptNote = pt.Topics[0].Sources.First(s => s.Url.EndsWith("gitignore", StringComparison.Ordinal)).Note;
        Assert.Contains("re-included", enNote);
        Assert.Contains("reincluído", ptNote);
        // A source keeps the language of its content, whatever the request language is.
        Assert.Contains(pt.Topics[0].Sources, s => s.Language == "en");
        Assert.Contains(pt.Topics[0].Sources, s => s.Language == "pt-BR");
    }

    [Fact]
    public async Task Sources_in_the_request_language_come_first_within_a_topic()
    {
        var pt = await Portuguese(api.CreateClient()).GetFromJsonAsync<ModuleResourcesDto>("/api/v1/modules/git-essentials/resources", TechRatFactory.Json);
        var languages = pt!.Topics[0].Sources.Select(s => s.Language).ToList();
        Assert.Equal("pt-BR", languages[0]);
        Assert.Equal(languages.OrderBy(l => l == "pt-BR" ? 0 : 1), languages);   // stable: pt-BR group, then the rest
    }

    [Fact]
    public async Task Every_published_roadmap_and_module_has_study_resources()
    {
        var catalog = api.Services.GetRequiredService<IStudyResourceCatalog>();
        var (roadmaps, modules) = await api.WithDbAsync(async db => (
            await db.Roadmaps.Where(r => r.IsPublished).Select(r => r.Slug).ToListAsync(),
            await db.LearningModules.Where(m => m.IsPublished).Select(m => m.Slug).ToListAsync()));
        Assert.Empty(roadmaps.Except(catalog.RoadmapSlugs));
        // "zz-" modules are created by other tests in the shared database.
        Assert.Empty(modules.Where(m => !m.StartsWith("zz-", StringComparison.Ordinal)).Except(catalog.ModuleSlugs));
    }

    [Fact]
    public async Task A_new_module_without_curated_resources_answers_with_an_empty_list()
    {
        var slug = $"zz-empty-{Guid.NewGuid():N}"[..20];
        await api.WithDbAsync(async db =>
        {
            db.LearningModules.Add(new() { Slug = slug, Name = "Empty", IsPublished = true });
            await db.SaveChangesAsync();
        });
        var module = await api.CreateClient().GetFromJsonAsync<ModuleResourcesDto>($"/api/v1/modules/{slug}/resources", TechRatFactory.Json);
        Assert.Empty(module!.Topics);
    }

    [Fact]
    public async Task Unknown_roadmaps_and_modules_are_not_found()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync("/api/v1/roadmaps/nope/resources")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync("/api/v1/modules/nope/resources")).StatusCode);
    }

    [Fact]
    public async Task Every_roadmap_and_module_in_the_resources_file_exists_in_the_catalog()
    {
        var catalog = api.Services.GetRequiredService<IStudyResourceCatalog>();
        var (roadmaps, modules) = await api.WithDbAsync(async db => (
            await db.Roadmaps.Select(r => r.Slug).ToListAsync(), await db.LearningModules.Select(m => m.Slug).ToListAsync()));
        Assert.NotEmpty(catalog.RoadmapSlugs);
        Assert.Empty(catalog.RoadmapSlugs.Except(roadmaps));
        Assert.NotEmpty(catalog.ModuleSlugs);
        Assert.Empty(catalog.ModuleSlugs.Except(modules));
    }

    [Fact]
    public async Task A_topic_library_gathers_the_reading_of_its_modules_and_the_pages_its_questions_cite()
    {
        var res = await api.CreateClient().GetFromJsonAsync<TopicResourcesDto>("/api/v1/topics/data-structures/resources", TechRatFactory.Json);

        Assert.Contains(res!.Modules, m => m.Slug == "linear-data-structures");
        Assert.All(res.Modules, m => Assert.All(m.Topics, t => Assert.NotEmpty(t.Sources)));
        Assert.NotEmpty(res.Cited);
        Assert.All(res.Cited.SelectMany(c => c.References), r =>
        {
            Assert.StartsWith("https://", r.Url);
            Assert.True(r.Questions >= 1);
            Assert.False(string.IsNullOrWhiteSpace(r.Host));
        });
        Assert.True(res.TotalLinks >= res.Modules.SelectMany(m => m.Topics).SelectMany(t => t.Sources).Count());
    }

    [Fact]
    public async Task A_topic_library_lists_each_link_once()
    {
        var res = await api.CreateClient().GetFromJsonAsync<TopicResourcesDto>("/api/v1/topics/system-design/resources", TechRatFactory.Json);

        var curated = res!.Modules.SelectMany(m => m.Topics).SelectMany(t => t.Sources).Select(s => s.Url).ToList();
        Assert.Equal(curated.Count, curated.Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.Contains(res.Modules, m => m.Slug == "system-design-foundations");
    }

    [Fact]
    public async Task A_topic_library_follows_the_request_language()
    {
        var en = await api.CreateClient().GetFromJsonAsync<TopicResourcesDto>("/api/v1/topics/data-structures/resources", TechRatFactory.Json);
        var pt = await Portuguese(api.CreateClient()).GetFromJsonAsync<TopicResourcesDto>("/api/v1/topics/data-structures/resources", TechRatFactory.Json);

        Assert.Equal("Linked Lists, Stacks & Queues", en!.Modules.First(m => m.Slug == "linear-data-structures").Name);
        Assert.NotEqual(en.Modules.First(m => m.Slug == "linear-data-structures").Name, pt!.Modules.First(m => m.Slug == "linear-data-structures").Name);
        Assert.Contains(pt.Cited, c => c.Slug == "linked-lists");
    }

    [Fact]
    public async Task Every_active_topic_has_a_curated_library()
    {
        var slugs = await api.WithDbAsync(db => db.Topics.Where(t => t.IsActive).Select(t => t.Slug).ToListAsync());
        var client = api.CreateClient();
        foreach (var slug in slugs.Where(s => !s.StartsWith("zz-", StringComparison.Ordinal)))
        {
            var res = await client.GetFromJsonAsync<TopicResourcesDto>($"/api/v1/topics/{slug}/resources", TechRatFactory.Json);
            Assert.True(res!.Modules.Count > 0, $"Topic {slug} has no curated reading: add resources for a module that teaches it.");
        }
    }

    [Fact]
    public async Task An_unknown_topic_has_no_library()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync("/api/v1/topics/nope/resources")).StatusCode);
    }
}
