using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Practice;
using TechRat.Domain.Content;
using TechRat.Infrastructure.Seed;

namespace TechRat.Tests.Integration;

[Collection(ApiCollection.Name)]
public class QuestionLocalizationTests(TechRatFactory api)
{
    private Task<Dictionary<(Guid, string), string>> PortugueseAsync(IEnumerable<Guid> ids) =>
        api.WithDbAsync(async db =>
        {
            var list = ids.ToList();
            return await db.ContentTranslations
                .Where(t => t.Locale == "pt-BR" && list.Contains(t.EntityId))
                .ToDictionaryAsync(t => (t.EntityId, t.Field), t => t.Value);
        });

    [Fact]
    public async Task Every_question_and_option_has_a_portuguese_translation()
    {
        var missing = await api.WithDbAsync(async db =>
        {
            var tr = (await db.ContentTranslations.Where(t => t.Locale == "pt-BR"
                    && (t.EntityType == TranslatableEntity.Question || t.EntityType == TranslatableEntity.QuestionOption))
                .Select(t => new { t.EntityId, t.Field }).ToListAsync()).Select(t => (t.EntityId, t.Field)).ToHashSet();
            var questions = await db.Questions.Where(q => q.ExternalKey != null).Select(q => new { q.Id, q.ExternalKey }).ToListAsync();
            var options = await db.QuestionOptions.Where(o => db.Questions.Any(q => q.Id == o.QuestionId && q.ExternalKey != null)).Select(o => o.Id).ToListAsync();
            return questions.SelectMany(q => new[] { TranslatableField.Title, TranslatableField.Text, TranslatableField.Explanation }
                    .Where(f => !tr.Contains((q.Id, f))).Select(f => $"{q.ExternalKey}:{f}"))
                .Concat(options.Where(o => !tr.Contains((o, TranslatableField.Text))).Select(o => $"option {o}"))
                .ToList();
        });
        Assert.Empty(missing);
    }

    [Fact]
    public async Task Practice_sessions_serve_questions_and_feedback_in_the_request_language()
    {
        var (client, _) = await api.CreateUserAsync();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("pt-BR");
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "git", count = 3 });

        var pt = await PortugueseAsync(s.Questions.Select(q => q.Id).Concat(s.Questions.SelectMany(q => q.Options.Select(o => o.Id))));
        Assert.All(s.Questions, q =>
        {
            Assert.Equal(pt[(q.Id, TranslatableField.Title)], q.Title);
            Assert.Equal(pt[(q.Id, TranslatableField.Text)], q.QuestionText);
            Assert.All(q.Options, o => Assert.Equal(pt[(o.Id, TranslatableField.Text)], o.Text));
        });

        var result = await Practice.AnswerAsync(api, client, s, s.Questions[0], correct: true);
        Assert.Equal(pt[(s.Questions[0].Id, TranslatableField.Explanation)], result.Feedback.Explanation);

        // Re-reading the session (answered question) keeps the feedback translated.
        var again = await client.GetFromJsonAsync<PracticeSessionDto>($"/api/v1/practice/sessions/{s.Id}", TechRatFactory.Json);
        Assert.Equal(pt[(s.Questions[0].Id, TranslatableField.Explanation)], again!.Questions[0].Answer!.Explanation);
    }

    [Fact]
    public async Task English_requests_keep_the_base_question_text()
    {
        var (client, _) = await api.CreateUserAsync();
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "git", count = 2 });
        var ids = s.Questions.Select(q => q.Id).ToList();
        var baseText = await api.WithDbAsync(db => db.Questions.Where(q => ids.Contains(q.Id)).ToDictionaryAsync(q => q.Id, q => q.QuestionText));
        Assert.All(s.Questions, q => Assert.Equal(baseText[q.Id], q.QuestionText));
    }

    [Fact]
    public async Task Seed_refreshes_unedited_seed_content_but_keeps_admin_edits()
    {
        // Two seeded questions: one untouched since seeding, one edited by an admin (UpdatedAt moved forward).
        var (stale, edited) = await api.WithDbAsync(async db =>
        {
            var pair = await db.Questions.Where(q => q.ExternalKey != null && q.CreatedAt == q.UpdatedAt).OrderBy(q => q.ExternalKey).Take(2).ToListAsync();
            return (pair[0], pair[1]);
        });
        var original = stale.QuestionText;
        await api.WithDbAsync(async db =>
        {
            await db.Questions.Where(q => q.Id == stale.Id).ExecuteUpdateAsync(u => u.SetProperty(q => q.QuestionText, "stale text"));
            await db.Questions.Where(q => q.Id == edited.Id).ExecuteUpdateAsync(u => u
                .SetProperty(q => q.QuestionText, "admin wording").SetProperty(q => q.UpdatedAt, q => q.CreatedAt.AddMinutes(5)));
            // A seed-managed translation that drifted, and one customised by an admin.
            await db.ContentTranslations.Where(t => t.EntityId == stale.Id && t.Field == TranslatableField.Title && t.Locale == "pt-BR")
                .ExecuteUpdateAsync(u => u.SetProperty(t => t.Value, "título velho"));
            await db.ContentTranslations.Where(t => t.EntityId == edited.Id && t.Field == TranslatableField.Title && t.Locale == "pt-BR")
                .ExecuteUpdateAsync(u => u.SetProperty(t => t.Value, "título do admin").SetProperty(t => t.SeedManaged, false));
            return 0;
        });

        using var scope = api.Services.CreateScope();
        var report = await scope.ServiceProvider.GetRequiredService<DatabaseSeeder>().SeedAsync();

        var (staleNow, editedNow, staleTitle, editedTitle) = await api.WithDbAsync(async db => (
            await db.Questions.Where(q => q.Id == stale.Id).Select(q => q.QuestionText).SingleAsync(),
            await db.Questions.Where(q => q.Id == edited.Id).Select(q => q.QuestionText).SingleAsync(),
            await db.ContentTranslations.Where(t => t.EntityId == stale.Id && t.Field == TranslatableField.Title && t.Locale == "pt-BR").Select(t => t.Value).SingleAsync(),
            await db.ContentTranslations.Where(t => t.EntityId == edited.Id && t.Field == TranslatableField.Title && t.Locale == "pt-BR").Select(t => t.Value).SingleAsync()));

        Assert.Equal(original, staleNow);
        Assert.Equal("admin wording", editedNow);
        Assert.NotEqual("título velho", staleTitle);
        Assert.Equal("título do admin", editedTitle);
        Assert.Equal(1, report.QuestionsUpdated);
        Assert.True(report.TranslationsUpdated >= 1);

        // Leave the shared database as other tests expect it.
        await api.WithDbAsync(async db =>
        {
            await db.Questions.Where(q => q.Id == edited.Id).ExecuteUpdateAsync(u => u
                .SetProperty(q => q.QuestionText, edited.QuestionText).SetProperty(q => q.UpdatedAt, edited.UpdatedAt));
            await db.ContentTranslations.Where(t => t.EntityId == edited.Id && t.Field == TranslatableField.Title && t.Locale == "pt-BR")
                .ExecuteUpdateAsync(u => u.SetProperty(t => t.SeedManaged, true));
            return 0;
        });
        using var again = api.Services.CreateScope();
        await again.ServiceProvider.GetRequiredService<DatabaseSeeder>().SeedAsync();
    }
}
