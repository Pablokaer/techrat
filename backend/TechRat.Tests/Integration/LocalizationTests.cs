using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TechRat.Application.Catalog;
using TechRat.Application.Roadmaps;
using TechRat.Application.Users;
using TechRat.Domain.Content;

namespace TechRat.Tests.Integration;

[Collection(ApiCollection.Name)]
public class LocalizationTests(TechRatFactory api)
{
    private static HttpClient WithLanguage(HttpClient client, string language)
    {
        client.DefaultRequestHeaders.AcceptLanguage.Clear();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(language);
        return client;
    }

    [Fact]
    public async Task Topics_come_back_in_the_request_language_and_default_to_english()
    {
        var english = (await api.CreateClient().GetFromJsonAsync<List<TopicDto>>("/api/v1/topics", TechRatFactory.Json))!;
        var portuguese = (await WithLanguage(api.CreateClient(), "pt-BR").GetFromJsonAsync<List<TopicDto>>("/api/v1/topics", TechRatFactory.Json))!;

        Assert.Equal("Data Structures", english.Single(t => t.Slug == "data-structures").Name);
        var ds = portuguese.Single(t => t.Slug == "data-structures");
        Assert.Equal("Estruturas de Dados", ds.Name);
        Assert.Equal(english.Count, portuguese.Count);
        Assert.Equal("Variáveis e Tipos", portuguese.Single(t => t.Slug == "programming-fundamentals").Subtopics.Single(s => s.Slug == "variables-types").Name);
    }

    [Theory]
    [InlineData("pt-PT,pt;q=0.9")]
    [InlineData("pt")]
    public async Task Any_portuguese_variant_gets_brazilian_portuguese(string header)
    {
        var topics = await WithLanguage(api.CreateClient(), header).GetFromJsonAsync<List<TopicDto>>("/api/v1/topics", TechRatFactory.Json);
        Assert.Equal("Estruturas de Dados", topics!.Single(t => t.Slug == "data-structures").Name);
    }

    [Fact]
    public async Task Unsupported_language_falls_back_to_english()
    {
        var topics = await WithLanguage(api.CreateClient(), "de-DE").GetFromJsonAsync<List<TopicDto>>("/api/v1/topics", TechRatFactory.Json);
        Assert.Equal("Data Structures", topics!.Single(t => t.Slug == "data-structures").Name);
    }

    [Fact]
    public async Task Roadmap_detail_is_translated_down_to_steps()
    {
        var detail = await WithLanguage(api.CreateClient(), "pt-BR")
            .GetFromJsonAsync<RoadmapDetailDto>("/api/v1/roadmaps/computer-science-fundamentals", TechRatFactory.Json);

        Assert.Equal("Fundamentos de Ciência da Computação", detail!.Summary.Name);
        var first = detail.Modules[0].Steps[0];
        Assert.Equal("Variáveis e Tipos", first.Title);
        Assert.Equal("Variáveis e Tipos", first.SubtopicName);
        Assert.Equal("Pratique Variáveis e Tipos em Fundamentos de Programação.", first.Description);
    }

    [Fact]
    public async Task Search_matches_english_and_portuguese_names()
    {
        var client = WithLanguage(api.CreateClient(), "pt-BR");
        var byPortuguese = await client.GetFromJsonAsync<List<SearchResultDto>>("/api/v1/search?q=estruturas", TechRatFactory.Json);
        var byEnglish = await client.GetFromJsonAsync<List<SearchResultDto>>("/api/v1/search?q=data structures", TechRatFactory.Json);

        Assert.Contains(byPortuguese!, r => r.Type == "Topic" && r.Slug == "data-structures" && r.Title == "Estruturas de Dados");
        Assert.Contains(byEnglish!, r => r.Type == "Topic" && r.Slug == "data-structures" && r.Title == "Estruturas de Dados");
    }

    [Fact]
    public async Task Validation_messages_follow_the_request_language()
    {
        var client = WithLanguage(api.CreateClient(), "pt-BR");
        var res = await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "123", password = "Passw0rdX", username = "pt_user", displayName = "Pt" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Falha na validação", body.GetProperty("title").GetString());
        Assert.Equal("Informe um e-mail válido.", body.GetProperty("errors").GetProperty("email")[0].GetString());

        var english = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/register", new { email = "123", password = "Passw0rdX", username = "en_user", displayName = "En" });
        var englishBody = await english.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Enter a valid email address.", englishBody.GetProperty("errors").GetProperty("email")[0].GetString());
    }

    [Fact]
    public async Task Identity_password_errors_are_translated()
    {
        var username = $"pw_{Guid.NewGuid():N}"[..20];
        var res = await WithLanguage(api.CreateClient(), "pt-BR").PostAsJsonAsync("/api/v1/auth/register",
            new { email = $"{username}@example.com", password = "short", username, displayName = "Pt" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var messages = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").GetProperty("password")
            .EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Contains("A senha deve ter pelo menos 8 caracteres.", messages);
        Assert.Contains("A senha deve ter pelo menos uma letra maiúscula ('A'-'Z').", messages);
    }

    [Fact]
    public async Task Invalid_login_message_is_translated()
    {
        var res = await WithLanguage(api.CreateClient(), "pt-BR").PostAsJsonAsync("/api/v1/auth/login", new { email = "nobody@example.com", password = "Wrong1234" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        Assert.Equal("E-mail ou senha inválidos.", (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Achievement_notifications_are_rendered_in_the_readers_language()
    {
        var (client, _) = await api.CreateUserAsync();
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "python", difficulty = "Easy", count = 1 });
        await Practice.AnswerAsync(api, client, s, s.Questions[0], true);
        await api.DrainOutboxAsync();

        var english = await client.GetFromJsonAsync<JsonElement>("/api/v1/notifications");
        Assert.All(english.GetProperty("items").EnumerateArray(), n => Assert.StartsWith("Achievement unlocked: ", n.GetProperty("title").GetString()));

        var portuguese = await WithLanguage(client, "pt-BR").GetFromJsonAsync<JsonElement>("/api/v1/notifications");
        var achievements = await client.GetFromJsonAsync<List<AchievementDto>>("/api/v1/achievements", TechRatFactory.Json);
        var firstQuestion = achievements!.Single(a => a.Code == "first-question");
        Assert.Contains(portuguese.GetProperty("items").EnumerateArray(),
            n => n.GetProperty("title").GetString() == $"Conquista desbloqueada: {firstQuestion.Name}");
        Assert.NotEqual("First Question", firstQuestion.Name);
    }

    [Fact]
    public async Task Every_catalog_entity_has_a_portuguese_translation()
    {
        var missing = await api.WithDbAsync(async db =>
        {
            var tr = (await db.ContentTranslations.Where(t => t.Locale == "pt-BR").Select(t => new { t.EntityType, t.EntityId, t.Field }).ToListAsync())
                .Select(t => (t.EntityType, t.EntityId, t.Field)).ToHashSet();
            var expected = new List<(string, Guid, string)>();
            expected.AddRange((await db.Topics.Select(x => x.Id).ToListAsync()).SelectMany(id => new[]
            {
                (TranslatableEntity.Topic, id, TranslatableField.Name), (TranslatableEntity.Topic, id, TranslatableField.Description),
                (TranslatableEntity.Topic, id, TranslatableField.Category),
            }));
            expected.AddRange((await db.Subtopics.Select(x => x.Id).ToListAsync()).Select(id => (TranslatableEntity.Subtopic, id, TranslatableField.Name)));
            // Fixtures created by other tests use the "t-" prefix and are not seeded content.
            expected.AddRange((await db.Roadmaps.Where(r => !r.Slug.StartsWith("t-")).Select(x => x.Id).ToListAsync()).SelectMany(id => new[]
            {
                (TranslatableEntity.Roadmap, id, TranslatableField.Name), (TranslatableEntity.Roadmap, id, TranslatableField.Description),
                (TranslatableEntity.Roadmap, id, TranslatableField.Category),
            }));
            expected.AddRange((await db.LearningModules.Where(m => m.IsPublished && !m.Slug.StartsWith("t-")).Select(x => x.Id).ToListAsync()).SelectMany(id => new[]
            {
                (TranslatableEntity.Module, id, TranslatableField.Name), (TranslatableEntity.Module, id, TranslatableField.Description),
            }));
            expected.AddRange((await db.ModuleSteps.Where(s => s.IsActive && !db.LearningModules.Any(m => m.Id == s.ModuleId && m.Slug.StartsWith("t-")))
                .Select(x => x.Id).ToListAsync()).SelectMany(id => new[]
            {
                (TranslatableEntity.ModuleStep, id, TranslatableField.Title), (TranslatableEntity.ModuleStep, id, TranslatableField.Description),
            }));
            expected.AddRange((await db.Achievements.Select(x => x.Id).ToListAsync()).SelectMany(id => new[]
            {
                (TranslatableEntity.Achievement, id, TranslatableField.Name), (TranslatableEntity.Achievement, id, TranslatableField.Description),
                (TranslatableEntity.Achievement, id, TranslatableField.Category),
            }));
            return expected.Where(e => !tr.Contains(e)).ToList();
        });
        Assert.Empty(missing);
    }
}
