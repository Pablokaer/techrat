using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TechRat.Application.Practice;

namespace TechRat.Tests.Integration;

/// <summary>
/// Sessions show answer options in their own random order (ADR-0019): stable within a session (reloads, review after
/// finishing), different across sessions, graded by option id and without touching the stored question.
/// </summary>
[Collection(ApiCollection.Name)]
public class OptionOrderTests(TechRatFactory api)
{
    private static Guid[] Order(SessionQuestionDto q) => [.. q.Options.Select(o => o.Id)];

    [Fact]
    public async Task A_session_keeps_its_option_order_on_every_read_and_in_the_review()
    {
        var (client, _) = await api.CreateUserAsync("opt");
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "git", count = 3 });

        var again = await client.GetFromJsonAsync<PracticeSessionDto>($"/api/v1/practice/sessions/{s.Id}", TechRatFactory.Json);
        Assert.Equal(s.Questions.Select(Order), again!.Questions.Select(Order));

        foreach (var q in s.Questions) await Practice.AnswerAsync(api, client, s, q, correct: true);
        var review = await client.GetFromJsonAsync<PracticeSessionDto>($"/api/v1/practice/sessions/{s.Id}", TechRatFactory.Json);
        Assert.Equal(s.Questions.Select(Order), review!.Questions.Select(Order));
    }

    [Fact]
    public async Task The_same_question_is_shown_in_different_orders_across_sessions()
    {
        var (client, _) = await api.CreateUserAsync("opt");
        var questionId = (await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "git", count = 1 })).Questions[0].Id;

        var orders = new HashSet<string>();
        for (var i = 0; i < 8; i++)
        {
            var s = await Practice.StartAsync(client, new { mode = "Learn", questionIds = new[] { questionId } });
            orders.Add(string.Join(",", Order(s.Questions[0])));
        }
        // 8 sessions with 24 possible orders: all identical would happen with probability (1/24)^7.
        Assert.True(orders.Count >= 2, $"only {orders.Count} distinct order(s)");
    }

    [Fact]
    public async Task Answers_are_graded_by_option_id_wherever_the_correct_option_is_shown()
    {
        var (client, _) = await api.CreateUserAsync("opt");
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "databases", count = 5 });
        foreach (var q in s.Questions)
        {
            var correctId = await api.OptionAsync(q.Id, correct: true);
            var result = await Practice.AnswerAsync(api, client, s, q, correct: true);
            Assert.True(result.Feedback.IsCorrect);
            Assert.Equal(correctId, result.Feedback.CorrectOptionId);
            Assert.Contains(q.Options, o => o.Id == correctId);
        }
    }

    [Fact]
    public async Task Showing_questions_never_changes_the_stored_option_order()
    {
        var (client, _) = await api.CreateUserAsync("opt");
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "git", count = 3 });
        var ids = s.Questions.Select(q => q.Id).ToList();
        var stored = await api.WithDbAsync(db => db.QuestionOptions.Where(o => ids.Contains(o.QuestionId))
            .OrderBy(o => o.QuestionId).ThenBy(o => o.DisplayOrder).Select(o => o.Id).ToListAsync());

        for (var i = 0; i < 3; i++) await client.GetFromJsonAsync<PracticeSessionDto>($"/api/v1/practice/sessions/{s.Id}", TechRatFactory.Json);

        var after = await api.WithDbAsync(db => db.QuestionOptions.Where(o => ids.Contains(o.QuestionId))
            .OrderBy(o => o.QuestionId).ThenBy(o => o.DisplayOrder).Select(o => o.Id).ToListAsync());
        Assert.Equal(stored, after);
    }
}
