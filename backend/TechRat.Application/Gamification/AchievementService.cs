using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Domain.Common;
using TechRat.Domain.Gamification;

namespace TechRat.Application.Gamification;

/// <summary>Snapshot of a learner's stats used to evaluate achievement rules.</summary>
public sealed record AchievementContext(
    int QuestionsAnswered,
    int CorrectAnswers,
    double Accuracy,
    int CurrentStreak,
    int LongestStreak,
    long TotalXp,
    int GlobalRank,
    IReadOnlyDictionary<string, (int Correct, int Level)> Topics,
    IReadOnlySet<string> CompletedRoadmaps);

public static class AchievementRules
{
    public static bool IsSatisfied(Achievement a, AchievementContext c) => a.RuleType switch
    {
        AchievementRuleType.QuestionsAnswered => c.QuestionsAnswered >= a.Threshold,
        AchievementRuleType.CorrectAnswers => c.CorrectAnswers >= a.Threshold,
        AchievementRuleType.StreakDays => Math.Max(c.CurrentStreak, c.LongestStreak) >= a.Threshold,
        AchievementRuleType.Accuracy => c.QuestionsAnswered >= (a.SecondaryThreshold ?? 1) && c.Accuracy >= a.Threshold,
        AchievementRuleType.TopicCorrect => a.TargetSlug is not null && c.Topics.TryGetValue(a.TargetSlug, out var t) && t.Correct >= a.Threshold,
        AchievementRuleType.TopicLevel => a.TargetSlug is not null && c.Topics.TryGetValue(a.TargetSlug, out var t) && t.Level >= a.Threshold,
        AchievementRuleType.RoadmapCompleted => a.TargetSlug is not null && c.CompletedRoadmaps.Contains(a.TargetSlug),
        AchievementRuleType.RoadmapsCompleted => c.CompletedRoadmaps.Count >= a.Threshold,
        AchievementRuleType.GlobalRank => c.GlobalRank > 0 && c.GlobalRank <= a.Threshold && c.TotalXp >= (a.SecondaryThreshold ?? 0),
        _ => false,
    };
}

public sealed record UnlockedAchievementDto(string Code, string Name, string Description, string Icon, string Tier, int XpReward);

public sealed class AchievementService(
    IAppDbContext db, XpService xp, IRealtimePublisher realtime, TimeProvider clock)
{
    /// <summary>Evaluates every locked achievement for the user, unlocking (and rewarding) the satisfied ones. Idempotent.</summary>
    public async Task<IReadOnlyList<UnlockedAchievementDto>> EvaluateAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.UserProfiles.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return [];

        var unlockedIds = await db.UserAchievements.Where(x => x.UserId == userId).Select(x => x.AchievementId).ToListAsync(ct);
        var candidates = await db.Achievements.Where(a => a.IsActive && !unlockedIds.Contains(a.Id)).ToListAsync(ct);
        if (candidates.Count == 0) return [];

        var context = await BuildContextAsync(user.Id, ct);
        var now = clock.GetUtcNow();
        var unlocked = new List<UnlockedAchievementDto>();

        foreach (var a in candidates.Where(a => AchievementRules.IsSatisfied(a, context)))
        {
            db.UserAchievements.Add(new UserAchievement { UserId = userId, AchievementId = a.Id, UnlockedAt = now });
            xp.Award(user, a.XPReward, XpReason.AchievementUnlocked, XpSourceType.Achievement, a.Id);
            db.Notifications.Add(new Notification
            {
                UserId = userId,
                Type = NotificationTypes.Achievement,
                // Base-language text; readers get it in their language from the achievement code (see NotificationService).
                Title = Text.GetFor(AppLocales.Default, Text.Keys.AchievementUnlockedTitle, a.Name),
                Body = Text.GetFor(AppLocales.Default, Text.Keys.AchievementUnlockedBody, a.Description, a.XPReward),
                ReferenceKey = a.Code,
                CreatedAt = now,
            });
            unlocked.Add(new UnlockedAchievementDto(a.Code, a.Name, a.Description, a.Icon, a.Tier.ToString(), a.XPReward));
        }

        if (unlocked.Count == 0) return unlocked;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex is not DbUpdateConcurrencyException)
        {
            // Concurrency conflicts on the user row propagate so the outbox retries the evaluation.
            // Another worker unlocked concurrently (unique key on UserId+AchievementId). Safe to ignore: next evaluation is a no-op.
            return [];
        }

        foreach (var u in unlocked)
            await realtime.PublishToUserAsync(userId, "achievementUnlocked", u, ct);
        return unlocked;
    }

    public async Task<AchievementContext> BuildContextAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.UserProfiles.AsNoTracking().FirstAsync(u => u.Id == userId, ct);
        var topics = await db.UserTopicProgress.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Join(db.Topics, p => p.TopicId, t => t.Id, (p, t) => new { t.Slug, p.CorrectAnswers, p.Level })
            .ToListAsync(ct);
        var completed = await db.UserRoadmapProgress.AsNoTracking()
            .Where(p => p.UserId == userId && p.CompletedAt != null)
            .Join(db.Roadmaps, p => p.RoadmapId, r => r.Id, (p, r) => r.Slug)
            .ToListAsync(ct);
        var rank = await db.UserProfiles.CountAsync(u => u.CurrentGlobalXP > user.CurrentGlobalXP, ct) + 1;

        return new AchievementContext(
            user.QuestionsAnswered, user.CorrectAnswers, user.GlobalAccuracy, user.CurrentStreak, user.LongestStreak,
            user.CurrentGlobalXP, rank,
            topics.ToDictionary(t => t.Slug, t => (t.CorrectAnswers, t.Level)),
            completed.ToHashSet());
    }
}
