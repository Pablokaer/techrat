using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using TechRat.Application.Analytics;
using TechRat.Application.Catalog;
using TechRat.Application.Common;
using TechRat.Application.Leaderboards;
using TechRat.Application.Notifications;
using TechRat.Application.Practice;
using TechRat.Application.Roadmaps;
using TechRat.Application.Users;
using TechRat.Domain.Common;
using TechRat.Domain.Roadmaps;
using TechRat.Modules.Common;

namespace TechRat.Modules.Learning;

public sealed class UsersEndpoints : IEndpointModule
{
    public void Map(RouteGroupBuilder api)
    {
        var users = api.MapGroup("/users").WithTags("Users");

        users.MapGet("/me", async (ProfileService profiles, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await profiles.GetSummaryAsync(me.RequireUserId(), me.IsAdmin, ct))).RequireAuthorization();

        users.MapPatch("/me", async (UpdateProfileRequest request, ProfileService profiles, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await profiles.UpdateAsync(me.RequireUserId(), me.IsAdmin, request, ct))).RequireAuthorization();

        users.MapGet("/me/dashboard", async (ProfileService profiles, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await profiles.GetDashboardAsync(me.RequireUserId(), me.IsAdmin, ct))).RequireAuthorization()
            .WithSummary("Home dashboard: stats, continue learning, current roadmap, recommendations, daily challenge");

        users.MapGet("/me/topic-progress", async (CatalogService catalog, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await catalog.TopicProgressAsync(me.RequireUserId(), ct))).RequireAuthorization();

        users.MapGet("/{username}/profile", async (string username, ProfileService profiles, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await profiles.GetProfileAsync(username, me.UserId, me.IsAdmin, ct))).RequireAuthorization()
            .WithSummary("Public profile with topic levels, achievements, roadmap progress and activity");
    }
}

public sealed class TopicsEndpoints : IEndpointModule
{
    public void Map(RouteGroupBuilder api)
    {
        var topics = api.MapGroup("/topics").WithTags("Topics");
        topics.MapGet("/", async (CatalogService catalog, CancellationToken ct) => TypedResults.Ok(await catalog.ListTopicsAsync(ct)))
            .WithSummary("Knowledge tree: topics, subtopics and question counts");
        topics.MapGet("/{slug}", async (string slug, CatalogService catalog, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await catalog.GetTopicAsync(slug, me.UserId, ct)));
        topics.MapGet("/{slug}/questions", async (string slug, string? subtopic, Difficulty? difficulty, CatalogService catalog, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await catalog.ListTopicQuestionsAsync(slug, subtopic, difficulty, me.RequireUserId(), ct))).RequireAuthorization()
            .WithSummary("Learn: the topic's questions (filter by subtopic and difficulty) with the learner's latest result on each; answer the chosen ones with a Learn session");

        api.MapGet("/search", async (string? q, CatalogService catalog, CancellationToken ct) => TypedResults.Ok(await catalog.SearchAsync(q, ct)))
            .WithTags("Search").WithSummary("Search topics, subtopics and roadmaps");
    }
}

public sealed class PracticeEndpoints : IEndpointModule
{
    public void Map(RouteGroupBuilder api)
    {
        var practice = api.MapGroup("/practice").WithTags("Practice").RequireAuthorization();

        practice.MapPost("/sessions", async (StartPracticeRequest request, PracticeService svc, ICurrentUser me, CancellationToken ct) =>
        {
            var session = await svc.StartAsync(me.RequireUserId(), request, ct);
            return TypedResults.Created($"/api/v1/practice/sessions/{session.Id}", session);
        }).WithSummary("Start a practice session: Practice, Challenge, Random or Adaptive (topic optional: without one, the whole question bank), a roadmap step, or Learn with the chosen questionIds");

        practice.MapGet("/sessions/{id:guid}", async (Guid id, PracticeService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.GetAsync(me.RequireUserId(), id, ct)));

        practice.MapPost("/sessions/{id:guid}/answers", async (Guid id, SubmitAnswerRequest request, PracticeService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.SubmitAnswerAsync(me.RequireUserId(), id, request, ct)))
            .RequireRateLimiting("answers")
            .WithSummary("Grade an answer: returns feedback, explanation, reference, XP, levels, streak and roadmap progress");

        var daily = api.MapGroup("/daily-challenge").WithTags("Daily Challenge").RequireAuthorization();
        daily.MapGet("/", async (DailyChallengeService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.GetStatusAsync(me.RequireUserId(), ct)));
        daily.MapPost("/start", async (DailyChallengeService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.StartAsync(me.RequireUserId(), ct)));
    }
}

public sealed class RoadmapsEndpoints : IEndpointModule
{
    public void Map(RouteGroupBuilder api)
    {
        var roadmaps = api.MapGroup("/roadmaps").WithTags("Roadmaps");
        roadmaps.MapGet("/", async (string? category, RoadmapService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.ListAsync(me.UserId, category, ct)));
        roadmaps.MapGet("/{slug}", async (string slug, RoadmapService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.GetAsync(slug, me.UserId, ct)));
        roadmaps.MapPost("/{slug}/start", async (string slug, RoadmapService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.StartAsync(me.RequireUserId(), slug, ct))).RequireAuthorization()
            .WithSummary("Enrol in a roadmap (fails with 403 while prerequisites are not met)");
    }
}

public sealed class ModulesEndpoints : IEndpointModule
{
    public void Map(RouteGroupBuilder api)
    {
        var modules = api.MapGroup("/modules").WithTags("Modules");
        modules.MapGet("/", async (ModuleKind? kind, string? category, ModuleService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.ListAsync(me.UserId, kind, category, ct)))
            .WithSummary("Module catalog: reusable modules shared by roadmaps, with the learner's progress when signed in");
        modules.MapGet("/{slug}", async (string slug, ModuleService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.GetAsync(slug, me.UserId, ct)));
    }
}

public sealed class ProgressEndpoints : IEndpointModule
{
    public void Map(RouteGroupBuilder api)
    {
        api.MapGet("/analytics/me", async (int? days, AnalyticsService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.GetAsync(me.RequireUserId(), days ?? 30, ct)))
            .WithTags("Analytics").RequireAuthorization();

        api.MapGet("/leaderboards/{scope}", async (LeaderboardScope scope, string? topic, int? page, int? pageSize,
                LeaderboardService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.GetAsync(scope, topic, page, pageSize, me.UserId, ct)))
            .WithTags("Leaderboard").RequireAuthorization()
            .WithSummary("Global, Weekly, Monthly or Topic leaderboard");

        api.MapGet("/achievements", async (ProfileService profiles, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await profiles.AchievementsAsync(me.RequireUserId(), ct)))
            .WithTags("Achievements").RequireAuthorization();

        var notifications = api.MapGroup("/notifications").WithTags("Notifications").RequireAuthorization();
        notifications.MapGet("/", async (NotificationService svc, ICurrentUser me, CancellationToken ct) =>
            TypedResults.Ok(await svc.ListAsync(me.RequireUserId(), ct)));
        notifications.MapPost("/read", async (NotificationService svc, ICurrentUser me, CancellationToken ct) =>
        {
            await svc.MarkReadAsync(me.RequireUserId(), null, ct);
            return TypedResults.NoContent();
        });
        notifications.MapPost("/{id:guid}/read", async (Guid id, NotificationService svc, ICurrentUser me, CancellationToken ct) =>
        {
            await svc.MarkReadAsync(me.RequireUserId(), id, ct);
            return TypedResults.NoContent();
        });
    }
}
