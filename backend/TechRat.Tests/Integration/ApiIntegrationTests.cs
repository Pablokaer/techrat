using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Catalog;
using TechRat.Application.Leaderboards;
using TechRat.Application.Practice;
using TechRat.Application.Roadmaps;
using TechRat.Application.Users;
using TechRat.Domain.Common;
using TechRat.Infrastructure.Seed;

namespace TechRat.Tests.Integration;

[Collection(ApiCollection.Name)]
public class SeedTests(TechRatFactory api)
{
    [Fact]
    public async Task Seed_contains_full_catalog()
    {
        var (questions, topics, subtopics, roadmaps, steps, achievements) = await api.WithDbAsync(async db => (
            await db.Questions.CountAsync(), await db.Topics.CountAsync(), await db.Subtopics.CountAsync(),
            await db.Roadmaps.CountAsync(), await db.ModuleSteps.CountAsync(), await db.Achievements.CountAsync()));

        Assert.True(questions >= 600, $"expected >= 600 questions, got {questions}");
        Assert.True(topics >= 30);
        Assert.True(subtopics >= 200);
        Assert.True(roadmaps >= 31);
        Assert.True(steps >= 279, $"expected >= 279 module steps, got {steps}");
        Assert.True(achievements >= 24);
    }

    [Fact]
    public async Task Every_question_has_four_options_exactly_one_correct_and_https_reference()
    {
        var bad = await api.WithDbAsync(db => db.Questions
            .Where(q => q.Options.Count != 4 || q.Options.Count(o => o.IsCorrect) != 1 || !q.ReferenceUrl.StartsWith("https://") || q.Explanation == "")
            .Select(q => q.ExternalKey).ToListAsync());
        Assert.Empty(bad);
    }

    [Fact]
    public async Task Every_difficulty_is_represented()
    {
        var byDifficulty = await api.WithDbAsync(db => db.Questions.GroupBy(q => q.Difficulty).Select(g => new { g.Key, Count = g.Count() }).ToListAsync());
        Assert.Equal(4, byDifficulty.Count);
        Assert.All(byDifficulty, d => Assert.True(d.Count >= 50));
    }

    [Fact]
    public async Task Every_roadmap_step_can_be_completed_with_existing_questions()
    {
        var steps = await api.WithDbAsync(db => db.ModuleSteps.Where(s => s.IsActive).Select(s => new
        {
            s.Title, s.MinimumQuestions,
            Available = db.Questions.Count(q => q.IsActive && q.TopicId == s.TopicId && (s.SubtopicId == null || q.SubtopicId == s.SubtopicId)),
        }).ToListAsync());
        Assert.All(steps, s => Assert.True(s.Available >= s.MinimumQuestions && s.MinimumQuestions >= 1, s.Title));
    }

    [Fact]
    public async Task Seeding_twice_is_idempotent()
    {
        var before = await api.WithDbAsync(async db => (await db.Questions.CountAsync(), await db.ModuleSteps.CountAsync(), await db.RoadmapDependencies.CountAsync()));
        using var scope = api.Services.CreateScope();
        var report = await scope.ServiceProvider.GetRequiredService<DatabaseSeeder>().SeedAsync();
        Assert.Equal(new SeedReport(0, 0, 0, 0, 0, 0, 0, 0, 0), report);
        var after = await api.WithDbAsync(async db => (await db.Questions.CountAsync(), await db.ModuleSteps.CountAsync(), await db.RoadmapDependencies.CountAsync()));
        Assert.Equal(before, after);
    }
}

[Collection(ApiCollection.Name)]
public class AuthTests(TechRatFactory api)
{
    [Theory]
    [InlineData("/api/v1/users/me")]
    [InlineData("/api/v1/users/me/dashboard")]
    [InlineData("/api/v1/analytics/me")]
    [InlineData("/api/v1/leaderboards/Global")]
    [InlineData("/api/v1/daily-challenge")]
    [InlineData("/api/v1/admin/stats")]
    public async Task Protected_endpoints_require_authentication(string url)
    {
        var res = await api.CreateClient().GetAsync(url);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Public_catalog_is_anonymous()
    {
        var client = api.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/topics")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/roadmaps")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/ready")).StatusCode);
    }

    [Fact]
    public async Task Learners_cannot_use_admin_endpoints_but_admins_can()
    {
        var (learner, _) = await api.CreateUserAsync();
        Assert.Equal(HttpStatusCode.Forbidden, (await learner.GetAsync("/api/v1/admin/stats")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await learner.PostAsJsonAsync("/api/v1/admin/topics", new { slug = "x", name = "X", description = "", category = "", icon = "code" })).StatusCode);

        var admin = api.CreateClient();
        await TechRatFactory.LoginAsync(admin, TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/v1/admin/stats")).StatusCode);
        var me = await admin.GetFromJsonAsync<UserSummaryDto>("/api/v1/users/me", TechRatFactory.Json);
        Assert.True(me!.IsAdmin);
    }

    [Fact]
    public async Task Register_validates_input_and_duplicates()
    {
        var client = api.CreateClient();
        var weak = await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "weak@example.com", password = "short", username = "weakuser" });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);
        var problem = await weak.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty("password", out _));

        var badName = await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "n@example.com", password = "Passw0rdX", username = "no spaces!" });
        Assert.Equal(HttpStatusCode.BadRequest, badName.StatusCode);

        var (_, username) = await api.CreateUserAsync();
        var dup = await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "other@example.com", password = "Passw0rdX", username });
        Assert.Equal(HttpStatusCode.BadRequest, dup.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_is_rejected_without_revealing_account_existence()
    {
        var client = api.CreateClient();
        var unknown = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = "nobody@example.com", password = "Passw0rdX" });
        var (_, username) = await api.CreateUserAsync();
        var wrong = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = $"{username}@example.com", password = "WrongPass1" });
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal((await unknown.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString(),
            (await wrong.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Refresh_works_and_logout_revokes_refresh_tokens()
    {
        var (client, username) = await api.CreateUserAsync();
        var tokens = await TechRatFactory.LoginAsync(client, $"{username}@example.com", "Passw0rdX");
        var refreshToken = tokens.GetProperty("refreshToken").GetString();

        var refreshed = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken });
        Assert.Equal(HttpStatusCode.OK, refreshed.StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/v1/auth/logout", null)).StatusCode);
        var afterLogout = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogout.StatusCode);
    }

    [Fact]
    public async Task Cookie_login_for_web_is_http_only()
    {
        var (_, username) = await api.CreateUserAsync();
        var client = api.CreateClient(new() { HandleCookies = true, BaseAddress = new Uri("https://localhost") });
        var res = await client.PostAsJsonAsync("/api/v1/auth/login?useCookies=true", new { email = $"{username}@example.com", password = "Passw0rdX" });
        Assert.True(res.IsSuccessStatusCode);
        var cookie = res.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("techrat.auth"));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/users/me")).StatusCode);
    }

    [Fact]
    public async Task Forgot_password_always_accepts()
    {
        var res = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/forgot-password", new { email = "nobody@example.com" });
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);
        var bad = await api.CreateClient().PostAsJsonAsync("/api/v1/auth/reset-password", new { email = "nobody@example.com", resetCode = "abc", newPassword = "Passw0rdY" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task Users_cannot_read_other_users_sessions()
    {
        var (alice, _) = await api.CreateUserAsync();
        var (bob, _) = await api.CreateUserAsync();
        var session = await Practice.StartAsync(alice, new { mode = "Practice", topicSlug = "git", count = 2 });
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/v1/practice/sessions/{session.Id}")).StatusCode);
        var q = session.Questions[0];
        var res = await bob.PostAsJsonAsync($"/api/v1/practice/sessions/{session.Id}/answers", new { questionId = q.Id, selectedOptionId = q.Options[0].Id, timeSpentSeconds = 3 });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}

internal static class Practice
{
    public static async Task<PracticeSessionDto> StartAsync(HttpClient client, object request)
    {
        var res = await client.PostAsJsonAsync("/api/v1/practice/sessions", request);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<PracticeSessionDto>(TechRatFactory.Json))!;
    }

    public static async Task<AnswerResultDto> AnswerAsync(TechRatFactory api, HttpClient client, PracticeSessionDto s, SessionQuestionDto q, bool correct)
    {
        var option = await api.OptionAsync(q.Id, correct);
        var res = await client.PostAsJsonAsync($"/api/v1/practice/sessions/{s.Id}/answers", new { questionId = q.Id, selectedOptionId = option, timeSpentSeconds = 10 });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<AnswerResultDto>(TechRatFactory.Json))!;
    }
}

[Collection(ApiCollection.Name)]
public class PracticeTests(TechRatFactory api)
{
    [Fact]
    public async Task Correct_answer_awards_question_xp_and_updates_topic_progress()
    {
        var (client, username) = await api.CreateUserAsync();
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "data-structures", difficulty = "Medium", count = 3 });
        Assert.Equal(3, s.TotalQuestions);
        Assert.All(s.Questions, q => Assert.Equal(Difficulty.Medium, q.Difficulty));
        Assert.All(s.Questions, q => Assert.Null(q.Answer));

        var r = await Practice.AnswerAsync(api, client, s, s.Questions[0], correct: true);
        Assert.True(r.Feedback.IsCorrect);
        Assert.Equal(25, r.Feedback.XpEarned);
        Assert.False(string.IsNullOrWhiteSpace(r.Feedback.Explanation));
        Assert.StartsWith("https://", r.Feedback.ReferenceUrl);
        Assert.Equal(1, r.CurrentStreak);
        Assert.Equal(25 + 5, r.TotalXp); // question + first-activity-of-the-day streak bonus
        Assert.Equal(25, r.TopicXp);

        var userId = await api.UserIdAsync(username);
        var (ledger, progress) = await api.WithDbAsync(async db => (
            await db.XPTransactions.Where(x => x.UserId == userId).SumAsync(x => x.Amount),
            await db.UserTopicProgress.SingleAsync(p => p.UserId == userId)));
        Assert.Equal(30, ledger);
        Assert.Equal((1, 1, 1, 1), (progress.QuestionsAnswered, progress.CorrectAnswers, progress.MediumAnswered, progress.MediumCorrect));
    }

    [Fact]
    public async Task Incorrect_answer_gives_feedback_but_no_xp()
    {
        var (client, _) = await api.CreateUserAsync();
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "networking", count = 1 });
        var r = await Practice.AnswerAsync(api, client, s, s.Questions[0], correct: false);
        Assert.False(r.Feedback.IsCorrect);
        Assert.NotEqual(r.Feedback.SelectedOptionId, r.Feedback.CorrectOptionId);
        Assert.Equal(0, r.Feedback.XpEarned);
        Assert.True(r.Session.IsComplete);
        Assert.Equal(0, r.Session.Correct);

        var reloaded = await client.GetFromJsonAsync<PracticeSessionDto>($"/api/v1/practice/sessions/{s.Id}", TechRatFactory.Json);
        Assert.NotNull(reloaded!.Questions[0].Answer);
        Assert.NotNull(reloaded.CompletedAt);
    }

    [Fact]
    public async Task Xp_is_awarded_only_once_per_question()
    {
        var (client, _) = await api.CreateUserAsync();
        var s1 = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "docker", subtopicSlug = "registries", count = 50 });
        var first = await Practice.AnswerAsync(api, client, s1, s1.Questions[0], true);
        Assert.True(first.Feedback.XpEarned > 0);

        // New session over the same tiny pool: the solved question comes back last but awards nothing.
        var s2 = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "docker", subtopicSlug = "registries", count = 50 });
        var again = s2.Questions.Single(q => q.Id == s1.Questions[0].Id);
        var replay = await Practice.AnswerAsync(api, client, s2, again, true);
        Assert.True(replay.Feedback.IsCorrect);
        Assert.Equal(0, replay.Feedback.XpEarned);
    }

    [Fact]
    public async Task Session_prioritises_unseen_questions()
    {
        var (client, _) = await api.CreateUserAsync();
        var s1 = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "system-design", count = 5 });
        foreach (var q in s1.Questions) await Practice.AnswerAsync(api, client, s1, q, true);
        var s2 = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "system-design", count = 5 });
        Assert.Empty(s2.Questions.Select(q => q.Id).Intersect(s1.Questions.Select(q => q.Id)));
    }

    [Fact]
    public async Task Next_session_draws_other_questions_even_when_the_previous_one_was_abandoned()
    {
        // Small pool (one subtopic): a session answered only once (wrong) must not bring its questions back first.
        var (client, _) = await api.CreateUserAsync();
        var poolSize = await api.WithDbAsync(db => db.Questions.CountAsync(q =>
            q.IsActive && q.Topic!.Slug == "programming-fundamentals" && q.Subtopic!.Slug == "variables-types"));
        Assert.True(poolSize >= 6, $"pool has {poolSize} questions");
        var request = new { mode = "Practice", topicSlug = "programming-fundamentals", subtopicSlug = "variables-types", count = poolSize / 2 };

        var s1 = await Practice.StartAsync(client, request);
        await Practice.AnswerAsync(api, client, s1, s1.Questions[0], correct: false);
        var s2 = await Practice.StartAsync(client, request);

        Assert.Empty(s2.Questions.Select(q => q.Id).Intersect(s1.Questions.Select(q => q.Id)));
    }

    [Fact]
    public async Task Double_submit_and_foreign_options_are_rejected()
    {
        var (client, _) = await api.CreateUserAsync();
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "git", count = 2 });
        var q = s.Questions[0];
        await Practice.AnswerAsync(api, client, s, q, true);
        var dup = await client.PostAsJsonAsync($"/api/v1/practice/sessions/{s.Id}/answers", new { questionId = q.Id, selectedOptionId = q.Options[0].Id, timeSpentSeconds = 1 });
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);

        var foreign = await client.PostAsJsonAsync($"/api/v1/practice/sessions/{s.Id}/answers", new { questionId = s.Questions[1].Id, selectedOptionId = q.Options[0].Id, timeSpentSeconds = 1 });
        Assert.Equal(HttpStatusCode.BadRequest, foreign.StatusCode);

        var notInSession = await client.PostAsJsonAsync($"/api/v1/practice/sessions/{s.Id}/answers", new { questionId = Guid.NewGuid(), selectedOptionId = q.Options[0].Id, timeSpentSeconds = 1 });
        Assert.Equal(HttpStatusCode.BadRequest, notInSession.StatusCode);
    }

    [Fact]
    public async Task Random_and_adaptive_sessions_start_with_the_requested_size()
    {
        var (client, _) = await api.CreateUserAsync();
        var random = await Practice.StartAsync(client, new { mode = "Random", count = 8 });
        Assert.Equal(8, random.TotalQuestions);
        var adaptive = await Practice.StartAsync(client, new { mode = "Adaptive", topicSlug = "algorithms", count = 10 });
        Assert.Equal(10, adaptive.TotalQuestions);
    }

    [Fact]
    public async Task Topic_level_and_difficulty_statistics_flow_into_analytics_and_profile()
    {
        var (client, username) = await api.CreateUserAsync();
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "system-design", difficulty = "Expert", count = 2 });
        foreach (var q in s.Questions) await Practice.AnswerAsync(api, client, s, q, true);   // 2 x 100 XP => topic level 2

        var topic = await client.GetFromJsonAsync<TopicDetailDto>("/api/v1/topics/system-design", TechRatFactory.Json);
        Assert.Equal(2, topic!.Progress!.Level.Level);
        Assert.Equal(100, topic.ByDifficulty.Single(d => d.Difficulty == "Expert").Accuracy);

        var analytics = await client.GetFromJsonAsync<JsonElement>("/api/v1/analytics/me?days=7");
        Assert.Equal(2, analytics.GetProperty("totalQuestions").GetInt32());
        Assert.Equal(2, analytics.GetProperty("byDifficulty").EnumerateArray().Single(d => d.GetProperty("difficulty").GetString() == "Expert").GetProperty("answered").GetInt32());

        var profile = await client.GetFromJsonAsync<ProfileDto>($"/api/v1/users/{username}/profile", TechRatFactory.Json);
        Assert.Equal(2, profile!.TopicProgress.Single(t => t.TopicSlug == "system-design").Level.Level);
        Assert.Equal(205, profile.User.Level.TotalXp);
        Assert.Equal(2, profile.User.Level.Level);
    }
}

[Collection(ApiCollection.Name)]
public class RoadmapTests(TechRatFactory api)
{
    [Fact]
    public async Task Starting_a_locked_roadmap_is_forbidden()
    {
        var (client, _) = await api.CreateUserAsync();
        var res = await client.PostAsync("/api/v1/roadmaps/system-design/start", null);
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        var detail = await client.GetFromJsonAsync<RoadmapDetailDto>("/api/v1/roadmaps/system-design", TechRatFactory.Json);
        Assert.False(detail!.Summary.Progress!.IsUnlocked);
        Assert.NotEmpty(detail.Prerequisites);
    }

    private async Task<HttpClient> AdminAsync()
    {
        var admin = api.CreateClient();
        await TechRatFactory.LoginAsync(admin, TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);
        return admin;
    }

    [Fact]
    public async Task Admin_sees_every_roadmap_unlocked_and_can_start_one_with_unmet_prerequisites()
    {
        var admin = await AdminAsync();
        var list = (await admin.GetFromJsonAsync<List<RoadmapSummaryDto>>("/api/v1/roadmaps", TechRatFactory.Json))!;
        Assert.NotEmpty(list);
        Assert.All(list, r => Assert.True(r.Progress!.IsUnlocked, r.Slug));

        var detail = await admin.GetFromJsonAsync<RoadmapDetailDto>("/api/v1/roadmaps/system-design", TechRatFactory.Json);
        Assert.True(detail!.Summary.Progress!.IsUnlocked);
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync("/api/v1/roadmaps/system-design/start", null)).StatusCode);
    }

    [Fact]
    public async Task Admin_has_every_module_and_step_open_without_completing_the_previous_ones()
    {
        var admin = await AdminAsync();
        var roadmap = (await admin.GetFromJsonAsync<RoadmapDetailDto>("/api/v1/roadmaps/git-and-collaboration", TechRatFactory.Json))!;
        Assert.True(roadmap.Modules.Count > 0);
        Assert.DoesNotContain(roadmap.Modules, m => m.Status == ModuleStatus.Locked);
        Assert.DoesNotContain(roadmap.Modules.SelectMany(m => m.Steps), s => s.Status == StepStatus.Locked);

        var module = (await admin.GetFromJsonAsync<ModuleDetailDto>($"/api/v1/modules/{roadmap.Modules[0].ModuleSlug}", TechRatFactory.Json))!;
        Assert.DoesNotContain(module.Steps, s => s.Status == StepStatus.Locked);
    }

    [Fact]
    public async Task Step_completes_only_after_criteria_and_unlocks_next_step()
    {
        var (client, _) = await api.CreateUserAsync();
        var start = await client.PostAsync("/api/v1/roadmaps/git-and-collaboration/start", null);
        Assert.Equal(HttpStatusCode.OK, start.StatusCode);
        var detail = (await start.Content.ReadFromJsonAsync<RoadmapDetailDto>(TechRatFactory.Json))!;
        var steps = detail.Modules.SelectMany(m => m.Steps).ToList();
        var first = steps[0];
        Assert.Equal(StepStatus.Current, first.Status);
        Assert.Equal(StepStatus.Locked, steps[1].Status);
        Assert.Equal(0, detail.Summary.Progress!.CompletedSteps); // opening does not complete anything

        var s = await Practice.StartAsync(client, new { roadmapStepId = first.Id, count = first.MinimumQuestions });
        Assert.Equal(PracticeMode.Roadmap, s.Mode);
        AnswerResultDto? last = null;
        foreach (var q in s.Questions.Take(first.MinimumQuestions)) last = await Practice.AnswerAsync(api, client, s, q, true);

        var completed = Assert.Single(last!.CompletedSteps);
        Assert.Equal(first.Id, completed.StepId);
        Assert.Equal(50, completed.XpEarned);

        var after = await client.GetFromJsonAsync<RoadmapDetailDto>("/api/v1/roadmaps/git-and-collaboration", TechRatFactory.Json);
        var afterSteps = after!.Modules.SelectMany(m => m.Steps).ToList();
        Assert.Equal(StepStatus.Completed, afterSteps[0].Status);
        Assert.Equal(StepStatus.Current, afterSteps[1].Status);
        Assert.Equal(1, after.Summary.Progress!.CompletedSteps);
    }

    [Fact]
    public async Task Failing_accuracy_keeps_step_open()
    {
        var (client, _) = await api.CreateUserAsync();
        var detail = (await (await client.PostAsync("/api/v1/roadmaps/docker/start", null)).Content.ReadFromJsonAsync<RoadmapDetailDto>(TechRatFactory.Json))!;
        var first = detail.Modules[0].Steps[0];
        var s = await Practice.StartAsync(client, new { roadmapStepId = first.Id, count = first.MinimumQuestions });
        foreach (var q in s.Questions) await Practice.AnswerAsync(api, client, s, q, false);
        var after = await client.GetFromJsonAsync<RoadmapDetailDto>("/api/v1/roadmaps/docker", TechRatFactory.Json);
        var step = after!.Modules[0].Steps[0];
        Assert.Equal(StepStatus.Current, step.Status);
        Assert.Equal(0, step.Criteria!.Accuracy);
        Assert.False(step.Criteria.IsMet);
    }

    [Fact]
    public async Task Progress_on_a_prerequisite_unlocks_the_dependent_roadmap()
    {
        var (client, username) = await api.CreateUserAsync();
        var userId = await api.UserIdAsync(username);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync("/api/v1/roadmaps/typescript-developer/start", null)).StatusCode);

        // typescript-developer requires 50% of javascript-developer: mark half of its required steps as completed.
        await api.WithDbAsync(async db =>
        {
            var js = await db.Roadmaps.SingleAsync(r => r.Slug == "javascript-developer");
            var steps = await (from l in db.RoadmapModuleLinks where l.RoadmapId == js.Id && l.IsRequired
                               join s in db.ModuleSteps on l.ModuleId equals s.ModuleId
                               where s.IsActive
                               orderby l.Order, s.Order
                               select s).ToListAsync();
            foreach (var st in steps.Take((int)Math.Ceiling(steps.Count / 2.0)))
                db.UserModuleStepCompletions.Add(new() { UserId = userId, ModuleId = st.ModuleId, ModuleStepId = st.Id, CompletedAt = DateTimeOffset.UtcNow });
            await db.SaveChangesAsync();
            return 0;
        });
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/api/v1/roadmaps/typescript-developer/start", null)).StatusCode);
    }
}

[Collection(ApiCollection.Name)]
public class GamificationTests(TechRatFactory api)
{
    [Fact]
    public async Task Achievements_unlock_in_background_once_and_reward_xp()
    {
        var (client, username) = await api.CreateUserAsync();
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "python", difficulty = "Easy", count = 1 });
        var r = await Practice.AnswerAsync(api, client, s, s.Questions[0], true);
        await api.DrainOutboxAsync();
        await api.DrainOutboxAsync(); // idempotent

        var achievements = await client.GetFromJsonAsync<List<AchievementDto>>("/api/v1/achievements", TechRatFactory.Json);
        Assert.Contains(achievements!, a => a.Code == "first-question" && a.Unlocked);
        Assert.Contains(achievements!, a => a.Code == "first-correct-answer" && a.Unlocked);
        Assert.Contains(achievements!, a => a.Code == "first-10-questions" && !a.Unlocked);

        var userId = await api.UserIdAsync(username);
        var (count, xp) = await api.WithDbAsync(async db => (
            await db.UserAchievements.CountAsync(x => x.UserId == userId),
            await db.UserProfiles.Where(u => u.Id == userId).Select(u => u.CurrentGlobalXP).SingleAsync()));
        Assert.Equal(2, count);
        Assert.Equal(r.TotalXp + 20, xp);

        var notifications = await client.GetFromJsonAsync<JsonElement>("/api/v1/notifications");
        Assert.Equal(2, notifications.GetProperty("unreadCount").GetInt32());
    }

    [Fact]
    public async Task Leaderboard_orders_by_xp_and_reports_my_rank()
    {
        var (low, _) = await api.CreateUserAsync("low");
        var (high, highName) = await api.CreateUserAsync("high");
        var s1 = await Practice.StartAsync(low, new { mode = "Practice", topicSlug = "kubernetes", difficulty = "Easy", count = 1 });
        await Practice.AnswerAsync(api, low, s1, s1.Questions[0], true);
        var s2 = await Practice.StartAsync(high, new { mode = "Practice", topicSlug = "kubernetes", difficulty = "Expert", count = 2 });
        foreach (var q in s2.Questions) await Practice.AnswerAsync(api, high, s2, q, true);

        var board = await high.GetFromJsonAsync<LeaderboardDto>("/api/v1/leaderboards/Topic?topic=kubernetes&pageSize=100", TechRatFactory.Json);
        var xs = board!.Entries.Select(e => e.Xp).ToList();
        Assert.Equal(xs.OrderByDescending(x => x), xs);
        Assert.Equal(highName, board.Me!.Username);
        Assert.Equal(1, board.Me.Rank);

        var weekly = await high.GetFromJsonAsync<LeaderboardDto>("/api/v1/leaderboards/Weekly?pageSize=100", TechRatFactory.Json);
        Assert.Contains(weekly!.Entries, e => e.Username == highName && e.Xp >= 100);
    }

    [Fact]
    public async Task Daily_challenge_bonus_is_paid_once()
    {
        var (client, _) = await api.CreateUserAsync();
        var start = await client.PostAsync("/api/v1/daily-challenge/start", null);
        var s = (await start.Content.ReadFromJsonAsync<PracticeSessionDto>(TechRatFactory.Json))!;
        Assert.True(s.IsDailyChallenge);
        Assert.Equal(5, s.TotalQuestions);
        Assert.Equal(5, s.Questions.Select(q => q.TopicSlug).Distinct().Count());

        AnswerResultDto? last = null;
        foreach (var q in s.Questions) last = await Practice.AnswerAsync(api, client, s, q, true);
        Assert.Equal(100, last!.DailyChallengeBonusXp);

        // Restarting returns the same session; no second bonus.
        var again = (await (await client.PostAsync("/api/v1/daily-challenge/start", null)).Content.ReadFromJsonAsync<PracticeSessionDto>(TechRatFactory.Json))!;
        Assert.Equal(s.Id, again.Id);
        var status = await client.GetFromJsonAsync<DailyChallengeStatusDto>("/api/v1/daily-challenge", TechRatFactory.Json);
        Assert.True(status!.Completed);
    }

    [Fact]
    public async Task Dashboard_returns_continue_learning_and_recommendations()
    {
        var (client, _) = await api.CreateUserAsync();
        var dash = await client.GetFromJsonAsync<DashboardDto>("/api/v1/users/me/dashboard", TechRatFactory.Json);
        Assert.Equal(4, dash!.ContinueLearning.Count);
        Assert.NotEmpty(dash.Recommended);
        Assert.Equal(1, dash.User.Level.Level);
    }

    [Fact]
    public async Task Search_finds_topics_and_roadmaps()
    {
        var results = await api.CreateClient().GetFromJsonAsync<List<SearchResultDto>>("/api/v1/search?q=docker", TechRatFactory.Json);
        Assert.Contains(results!, r => r.Type == "Topic" && r.Slug == "docker");
        Assert.Contains(results!, r => r.Type == "Roadmap" && r.Slug == "docker");
        var csharp = await api.CreateClient().GetFromJsonAsync<List<SearchResultDto>>("/api/v1/search?q=c%23", TechRatFactory.Json);
        Assert.Contains(csharp!, r => r.Slug == "csharp");
    }

    [Fact]
    public async Task Admin_can_create_edit_and_deactivate_questions()
    {
        var admin = api.CreateClient();
        await TechRatFactory.LoginAsync(admin, TechRatFactory.AdminEmail, TechRatFactory.AdminPassword);
        var input = new
        {
            topicSlug = "git", subtopicSlug = "basics", difficulty = "Easy", title = "Admin question", questionText = "Which command records staged changes?",
            explanation = "git commit records the staged snapshot in history.", referenceUrl = "https://git-scm.com/docs/git-commit", xpReward = 12, isActive = true,
            options = new[] { new { text = "git commit", isCorrect = true }, new { text = "git add", isCorrect = false }, new { text = "git push", isCorrect = false }, new { text = "git fetch", isCorrect = false } },
        };
        var created = await admin.PostAsJsonAsync("/api/v1/admin/questions", input);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var invalid = await admin.PostAsJsonAsync("/api/v1/admin/questions", input with { options = input.options.Select(o => o with { isCorrect = true }).ToArray() });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

        var updated = await admin.PutAsJsonAsync($"/api/v1/admin/questions/{id}", input with { title = "Edited" });
        Assert.Equal("Edited", (await updated.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/v1/admin/questions/{id}/deactivate", null)).StatusCode);
        Assert.False(await api.WithDbAsync(db => db.Questions.Where(q => q.Id == id).Select(q => q.IsActive).SingleAsync()));
    }
}
