using Microsoft.EntityFrameworkCore;
using TechRat.Application.Catalog;
using TechRat.Application.Common;
using TechRat.Application.Gamification;
using TechRat.Application.Practice;
using TechRat.Application.Roadmaps;
using TechRat.Domain.Gamification;

namespace TechRat.Application.Users;

public sealed record UserSummaryDto(
    Guid Id, string Username, string DisplayName, string Email, string? AvatarUrl, string? Bio, bool IsAdmin,
    LevelDto Level, int CurrentStreak, int LongestStreak, int QuestionsAnswered, int CorrectAnswers, double Accuracy,
    int GlobalRank, DateTimeOffset CreatedAt);

public sealed record AchievementDto(
    string Code, string Name, string Description, string Category, string Icon, string Tier, int XpReward, bool Unlocked, DateTimeOffset? UnlockedAt);

public sealed record RoadmapProgressSummaryDto(string Slug, string Name, string Icon, string Category, int CompletedSteps, int StepsCount,
    double PercentComplete, string? CurrentStepTitle, Guid? CurrentStepId, bool IsCompleted, DateTimeOffset LastActivityAt);

public sealed record RecommendationDto(string Kind, string Title, string Reason, string TopicSlug, string? SubtopicSlug, string? Difficulty);

public sealed record DashboardDto(
    UserSummaryDto User,
    IReadOnlyList<TopicProgressDto> ContinueLearning,
    RoadmapProgressSummaryDto? CurrentRoadmap,
    IReadOnlyList<RoadmapStepDto> CurrentRoadmapSteps,
    IReadOnlyList<RecommendationDto> Recommended,
    DailyChallengeStatusDto DailyChallenge,
    IReadOnlyList<AchievementDto> RecentAchievements,
    int UnreadNotifications);

public sealed record ProfileDto(
    UserSummaryDto User,
    IReadOnlyList<TopicProgressDto> TopicProgress,
    IReadOnlyList<DifficultyBreakdownDto> AccuracyByDifficulty,
    IReadOnlyList<AchievementDto> Achievements,
    IReadOnlyList<RoadmapProgressSummaryDto> Roadmaps,
    IReadOnlyList<TopicProgressDto> StrongestTopics,
    IReadOnlyList<TopicProgressDto> WeakestTopics,
    IReadOnlyList<Analytics.DailyActivityDto> Activity);

public sealed record UpdateProfileRequest(string? DisplayName, string? Bio, string? AvatarUrl);

public sealed class ProfileService(
    IAppDbContext db,
    LevelService levels,
    CatalogService catalog,
    RoadmapService roadmaps,
    DailyChallengeService daily,
    Analytics.AnalyticsService analytics,
    Leaderboards.LeaderboardService leaderboard,
    ContentLocalizer localizer,
    TimeProvider clock)
{
    private static readonly string[] StarterTopics = ["programming-fundamentals", "data-structures", "system-design", "ai-engineering"];

    public async Task<UserSummaryDto> GetSummaryAsync(Guid userId, bool isAdmin, CancellationToken ct)
    {
        var u = await db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct) ?? throw new NotFoundException("User", userId);
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        var rank = await leaderboard.GlobalRankAsync(userId, ct);
        return new UserSummaryDto(u.Id, u.Username, u.DisplayName, u.Email, u.AvatarUrl, u.Bio, isAdmin,
            LevelDto.From(levels.Evaluate(u.CurrentGlobalXP)), StreakRules.Effective(u.LastActivityDate, u.CurrentStreak, today),
            u.LongestStreak, u.QuestionsAnswered, u.CorrectAnswers, u.GlobalAccuracy, rank, u.CreatedAt);
    }

    public async Task<DashboardDto> GetDashboardAsync(Guid userId, bool isAdmin, CancellationToken ct)
    {
        var summary = await GetSummaryAsync(userId, isAdmin, ct);
        var topicProgress = await catalog.TopicProgressAsync(userId, ct);

        var continueLearning = topicProgress.Take(4).ToList();
        if (continueLearning.Count < 4)
        {
            var topics = await catalog.ListTopicsAsync(ct);
            foreach (var slug in StarterTopics.Where(s => continueLearning.All(c => c.TopicSlug != s)).Take(4 - continueLearning.Count))
            {
                var t = topics.First(x => x.Slug == slug);
                continueLearning.Add(new TopicProgressDto(t.Slug, t.Name, t.Icon, t.Category, LevelDto.From(levels.Evaluate(0)), 0, 0, 0,
                    t.Questions.Total, 0, 0, null));
            }
        }

        var roadmapList = await RoadmapSummariesAsync(userId, ct);
        var current = roadmapList.Where(r => !r.IsCompleted).OrderByDescending(r => r.LastActivityAt).FirstOrDefault();
        IReadOnlyList<RoadmapStepDto> currentSteps = [];
        if (current is not null)
        {
            var detail = await roadmaps.GetAsync(current.Slug, userId, ct);
            var all = detail.Modules.SelectMany(m => m.Steps).ToList();
            var idx = Math.Max(0, all.FindIndex(s => s.Status == StepStatus.Current) - 1);
            currentSteps = all.Skip(idx).Take(5).ToList();
        }

        var recommended = await RecommendAsync(userId, topicProgress, currentSteps, ct);
        var achievements = (await AchievementsAsync(userId, ct)).Where(a => a.Unlocked).OrderByDescending(a => a.UnlockedAt).Take(3).ToList();
        var unread = await db.Notifications.CountAsync(n => n.UserId == userId && n.ReadAt == null, ct);

        return new DashboardDto(summary, continueLearning, current, currentSteps, recommended,
            await daily.GetStatusAsync(userId, ct), achievements, unread);
    }

    private async Task<List<RecommendationDto>> RecommendAsync(Guid userId, List<TopicProgressDto> progress, IReadOnlyList<RoadmapStepDto> steps, CancellationToken ct)
    {
        var recs = new List<RecommendationDto>();
        var currentStep = steps.FirstOrDefault(s => s.Status == StepStatus.Current);
        if (currentStep is not null)
            recs.Add(new("RoadmapStep", currentStep.Title, Text.Get(Text.Keys.RecNextStep), currentStep.TopicSlug, currentStep.SubtopicSlug, null));

        foreach (var weak in progress.Where(p => p.QuestionsAnswered >= 5).OrderBy(p => p.Accuracy).Take(2))
            recs.Add(new("Weakness", weak.TopicName, Text.Get(Text.Keys.RecWeakness, weak.Accuracy), weak.TopicSlug, null, "Easy"));

        var stats = await db.UserTopicProgress.AsNoTracking().Where(p => p.UserId == userId).ToListAsync(ct);
        var mediumAnswered = stats.Sum(s => s.MediumAnswered);
        var mediumAcc = mediumAnswered == 0 ? 0 : 100.0 * stats.Sum(s => s.MediumCorrect) / mediumAnswered;
        var strongest = progress.Where(p => p.QuestionsAnswered >= 5).OrderByDescending(p => p.Accuracy).FirstOrDefault();
        if (strongest is not null && mediumAcc >= 75)
            recs.Add(new("Challenge", strongest.TopicName, Text.Get(Text.Keys.RecChallenge), strongest.TopicSlug, null, "Hard"));

        if (recs.Count < 3)
            foreach (var slug in StarterTopics.Where(s => progress.All(p => p.TopicSlug != s)).Take(3 - recs.Count))
            {
                var t = (await catalog.ListTopicsAsync(ct)).First(x => x.Slug == slug);
                recs.Add(new("Explore", t.Name, Text.Get(Text.Keys.RecExplore), t.Slug, null, null));
            }
        return recs.Take(4).ToList();
    }

    public async Task<List<AchievementDto>> AchievementsAsync(Guid userId, CancellationToken ct)
    {
        var unlocked = await db.UserAchievements.AsNoTracking().Where(x => x.UserId == userId)
            .ToDictionaryAsync(x => x.AchievementId, x => x.UnlockedAt, ct);
        var all = await db.Achievements.AsNoTracking().Where(a => a.IsActive).ToListAsync(ct);
        var tr = await localizer.LoadAsync(ct);
        return all.Select(a => (a.Tier, Dto: new AchievementDto(a.Code, tr.AchievementName(a.Id, a.Name), tr.AchievementDescription(a.Id, a.Description),
                tr.AchievementCategory(a.Id, a.Category), a.Icon, a.Tier.ToString(), a.XPReward,
                unlocked.ContainsKey(a.Id), unlocked.TryGetValue(a.Id, out var at) ? at : null)))
            .OrderByDescending(x => x.Dto.Unlocked).ThenBy(x => x.Tier).ThenBy(x => x.Dto.Name, StringComparer.CurrentCulture)
            .Select(x => x.Dto).ToList();
    }

    public async Task<List<RoadmapProgressSummaryDto>> RoadmapSummariesAsync(Guid userId, CancellationToken ct)
    {
        var rows = await (from p in db.UserRoadmapProgress.AsNoTracking()
                          where p.UserId == userId
                          join r in db.Roadmaps on p.RoadmapId equals r.Id
                          join s in db.RoadmapSteps on p.CurrentStepId equals s.Id into ss
                          from s in ss.DefaultIfEmpty()
                          select new { r.Id, r.Slug, r.Name, r.Icon, r.Category, p.CompletedSteps, r.StepsCount, StepTitle = s != null ? s.Title : null,
                              p.CurrentStepId, p.CompletedAt, p.LastActivityAt })
                         .ToListAsync(ct);
        var tr = await localizer.LoadAsync(ct);
        return rows.Select(r => new RoadmapProgressSummaryDto(r.Slug, tr.RoadmapName(r.Id, r.Name), r.Icon, tr.RoadmapCategory(r.Id, r.Category),
                r.CompletedSteps, r.StepsCount, r.StepsCount == 0 ? 0 : Math.Round(100.0 * r.CompletedSteps / r.StepsCount, 1),
                r.CurrentStepId is { } sid && r.StepTitle is not null ? tr.StepTitle(sid, r.StepTitle) : r.StepTitle, r.CurrentStepId,
                r.CompletedAt is not null, r.LastActivityAt))
            .OrderByDescending(r => r.LastActivityAt).ToList();
    }

    public async Task<ProfileDto> GetProfileAsync(string username, Guid? viewerId, bool viewerIsAdmin, CancellationToken ct)
    {
        var user = await db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username.ToLower(), ct)
            ?? throw new NotFoundException("User", username);
        var summary = await GetSummaryAsync(user.Id, viewerIsAdmin && viewerId == user.Id, ct);
        if (viewerId != user.Id) summary = summary with { Email = "" }; // never expose emails publicly

        var topics = await catalog.TopicProgressAsync(user.Id, ct);
        var stats = await analytics.GetAsync(user.Id, 90, ct);
        var eligible = topics.Where(t => t.QuestionsAnswered >= Analytics.TopicStrength.MinAnswers).ToList();
        var strongest = eligible.OrderByDescending(t => t.Accuracy).Take(3).ToList();
        var weakest = eligible.Where(t => !strongest.Contains(t) || eligible.Count <= 3).OrderBy(t => t.Accuracy).Take(3).ToList();

        return new ProfileDto(summary, topics, stats.ByDifficulty, await AchievementsAsync(user.Id, ct),
            await RoadmapSummariesAsync(user.Id, ct), strongest, weakest, stats.Daily);
    }

    public async Task<UserSummaryDto> UpdateAsync(Guid userId, bool isAdmin, UpdateProfileRequest request, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.DisplayName is { } dn && (dn.Trim().Length is < 2 or > 40)) errors["displayName"] = [Text.Get(Text.Keys.DisplayNameLength)];
        if (request.Bio is { Length: > 280 }) errors["bio"] = [Text.Get(Text.Keys.BioTooLong)];
        if (!string.IsNullOrWhiteSpace(request.AvatarUrl) &&
            (!Uri.TryCreate(request.AvatarUrl, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || request.AvatarUrl.Length > 500))
            errors["avatarUrl"] = [Text.Get(Text.Keys.AvatarHttps)];
        if (errors.Count > 0) throw new RequestValidationException(errors);

        var user = await db.UserProfiles.FirstAsync(u => u.Id == userId, ct);
        if (request.DisplayName is not null) user.DisplayName = request.DisplayName.Trim();
        if (request.Bio is not null) user.Bio = request.Bio.Trim();
        if (request.AvatarUrl is not null) user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
        await db.SaveChangesAsync(ct);
        return await GetSummaryAsync(userId, isAdmin, ct);
    }
}
