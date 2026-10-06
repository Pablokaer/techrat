using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TechRat.Application.Catalog;
using TechRat.Application.Practice;
using TechRat.Domain.Common;

namespace TechRat.Tests.Integration;

/// <summary>
/// Practice draws from the whole question bank (every question used by roadmaps); Learn lets the learner browse a
/// topic's questions, filter them by difficulty and answer the ones they pick.
/// </summary>
[Collection(ApiCollection.Name)]
public class LearnAndPracticeScopeTests(TechRatFactory api)
{
    [Fact]
    public async Task Practice_and_challenge_without_a_topic_draw_from_the_whole_bank()
    {
        var (client, _) = await api.CreateUserAsync();

        var practice = await Practice.StartAsync(client, new { mode = "Practice", difficulty = "Hard", count = 30 });
        Assert.Equal(30, practice.TotalQuestions);
        Assert.All(practice.Questions, q => Assert.Equal(Difficulty.Hard, q.Difficulty));
        Assert.True(practice.Questions.Select(q => q.TopicSlug).Distinct().Count() >= 5, "questions should come from many topics");

        var challenge = await Practice.StartAsync(client, new { mode = "Challenge", count = 20 });
        Assert.Equal(20, challenge.TotalQuestions);
        Assert.DoesNotContain(challenge.Questions, q => q.Difficulty == Difficulty.Easy);
    }

    [Fact]
    public async Task Learn_lists_a_topics_questions_filtered_by_subtopic_and_difficulty_with_the_learners_status()
    {
        var (client, _) = await api.CreateUserAsync();
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateClient().GetAsync("/api/v1/topics/data-structures/questions")).StatusCode);

        var all = await client.GetFromJsonAsync<List<TopicQuestionDto>>("/api/v1/topics/data-structures/questions", TechRatFactory.Json);
        var expected = await api.WithDbAsync(db => db.Questions.CountAsync(q => q.IsActive && q.Topic!.Slug == "data-structures"));
        Assert.Equal(expected, all!.Count);
        Assert.All(all, q => Assert.Equal(LearnQuestionStatus.New, q.Status));
        Assert.Equal(all.OrderBy(q => q.Difficulty).Select(q => q.Difficulty), all.Select(q => q.Difficulty)); // easiest first

        var hard = await client.GetFromJsonAsync<List<TopicQuestionDto>>("/api/v1/topics/data-structures/questions?difficulty=Hard", TechRatFactory.Json);
        Assert.NotNull(hard);
        Assert.NotEmpty(hard);
        Assert.All(hard, q => Assert.Equal(Difficulty.Hard, q.Difficulty));

        var sub = all[0].SubtopicSlug;
        var inSub = await client.GetFromJsonAsync<List<TopicQuestionDto>>($"/api/v1/topics/data-structures/questions?subtopic={sub}", TechRatFactory.Json);
        Assert.All(inSub!, q => Assert.Equal(sub, q.SubtopicSlug));

        // Answer two of them through a Learn session: one right, one wrong.
        var s = await Practice.StartAsync(client, new { mode = "Learn", questionIds = new[] { hard[0].Id, hard[1].Id } });
        await Practice.AnswerAsync(api, client, s, s.Questions[0], correct: true);
        await Practice.AnswerAsync(api, client, s, s.Questions[1], correct: false);
        var after = await client.GetFromJsonAsync<List<TopicQuestionDto>>("/api/v1/topics/data-structures/questions?difficulty=Hard", TechRatFactory.Json);
        Assert.NotNull(after);
        Assert.Equal(LearnQuestionStatus.Correct, after.Single(q => q.Id == hard[0].Id).Status);
        Assert.Equal(LearnQuestionStatus.Wrong, after.Single(q => q.Id == hard[1].Id).Status);
        Assert.Equal(LearnQuestionStatus.New, after.Single(q => q.Id == hard[2].Id).Status);
    }

    [Fact]
    public async Task Learn_session_contains_exactly_the_chosen_questions_in_the_chosen_order()
    {
        var (client, _) = await api.CreateUserAsync();
        var questions = await client.GetFromJsonAsync<List<TopicQuestionDto>>("/api/v1/topics/algorithms/questions", TechRatFactory.Json);
        var chosen = new[] { questions![5].Id, questions[0].Id, questions[3].Id };

        var s = await Practice.StartAsync(client, new { mode = "Learn", questionIds = chosen.Append(chosen[0]) }); // duplicates are ignored
        Assert.Equal(PracticeMode.Learn, s.Mode);
        Assert.Equal(chosen, s.Questions.Select(q => q.Id));
        Assert.Equal("algorithms", s.TopicSlug);

        var answer = await Practice.AnswerAsync(api, client, s, s.Questions[0], correct: true);
        Assert.True(answer.Feedback.IsCorrect);
        Assert.True(answer.Feedback.XpEarned > 0);
    }

    [Fact]
    public async Task Learn_session_rejects_an_empty_unknown_or_oversized_choice()
    {
        var (client, _) = await api.CreateUserAsync();
        var ids = await api.WithDbAsync(db => db.Questions.Where(q => q.IsActive).Select(q => q.Id).Take(PracticeService.MaxQuestionsPerSession + 1).ToListAsync());

        foreach (var body in new object[]
                 {
                     new { mode = "Learn" },
                     new { mode = "Learn", questionIds = Array.Empty<Guid>() },
                     new { mode = "Learn", questionIds = new[] { Guid.NewGuid() } },
                     new { mode = "Learn", questionIds = ids },
                     new { mode = "Practice", topicSlug = "algorithms", questionIds = ids.Take(2) },
                 })
        {
            var res = await client.PostAsJsonAsync("/api/v1/practice/sessions", body);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }
    }
}
