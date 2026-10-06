using Microsoft.EntityFrameworkCore;
using TechRat.Application.Catalog;
using TechRat.Application.Common;
using TechRat.Domain.Common;

namespace TechRat.Application.Analytics;

public sealed record DailyActivityDto(DateOnly Date, int Questions, int Correct, int XpEarned, int StudySeconds);

public sealed record TopicAccuracyDto(string Slug, string Name, int Answered, int Correct, double Accuracy);

public sealed record SubtopicAccuracyDto(string TopicSlug, string Slug, string Name, int Answered, int Correct, double Accuracy);

public sealed record AnalyticsDto(
    int Days,
    int TotalQuestions,
    int TotalCorrect,
    double GlobalAccuracy,
    int StudySeconds,
    long XpEarnedInPeriod,
    int CurrentStreak,
    int LongestStreak,
    double XpLast7Days,
    double XpPrevious7Days,
    double VelocityChangePercent,
    IReadOnlyList<DifficultyBreakdownDto> ByDifficulty,
    IReadOnlyList<TopicAccuracyDto> ByTopic,
    IReadOnlyList<SubtopicAccuracyDto> BySubtopic,
    IReadOnlyList<DailyActivityDto> Daily,
    IReadOnlyList<TopicAccuracyDto> StrongestTopics,
    IReadOnlyList<TopicAccuracyDto> WeakestTopics);

/// <summary>Strongest/weakest classification (pure, unit-tested).</summary>
public static class TopicStrength
{
    public const int MinAnswers = 5;

    public static (List<TopicAccuracyDto> Strongest, List<TopicAccuracyDto> Weakest) Classify(IEnumerable<TopicAccuracyDto> topics, int take = 3)
    {
        var eligible = topics.Where(t => t.Answered >= MinAnswers).ToList();
        var strongest = eligible.OrderByDescending(t => t.Accuracy).ThenByDescending(t => t.Answered).Take(take).ToList();
        var weakest = eligible.Where(t => !strongest.Contains(t) || eligible.Count <= take)
            .OrderBy(t => t.Accuracy).ThenByDescending(t => t.Answered).Take(take).ToList();
        return (strongest, weakest);
    }
}

public sealed class AnalyticsService(IAppDbContext db, ContentLocalizer localizer, TimeProvider clock)
{
    public async Task<AnalyticsDto> GetAsync(Guid userId, int days, CancellationToken ct)
    {
        days = Math.Clamp(days, 7, 365);
        var now = clock.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var from = new DateTimeOffset(today.AddDays(-(days - 1)).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

        var user = await db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct) ?? throw new NotFoundException("User", userId);

        // Period data is bounded by `days`, so grouping in memory keeps the SQL portable and simple.
        var attempts = await db.QuestionAttempts.AsNoTracking().Where(a => a.UserId == userId && a.AnsweredAt >= from)
            .Select(a => new { a.AnsweredAt, a.IsCorrect, a.TimeSpentSeconds }).ToListAsync(ct);
        var xpRows = await db.XPTransactions.AsNoTracking().Where(x => x.UserId == userId && x.CreatedAt >= now.AddDays(-Math.Max(days, 14)))
            .Select(x => new { x.CreatedAt, x.Amount }).ToListAsync(ct);

        var daily = Enumerable.Range(0, days).Select(i => today.AddDays(-(days - 1) + i)).Select(d =>
        {
            var a = attempts.Where(x => DateOnly.FromDateTime(x.AnsweredAt.UtcDateTime) == d).ToList();
            var xp = xpRows.Where(x => DateOnly.FromDateTime(x.CreatedAt.UtcDateTime) == d).Sum(x => x.Amount);
            return new DailyActivityDto(d, a.Count, a.Count(x => x.IsCorrect), xp, a.Sum(x => x.TimeSpentSeconds));
        }).ToList();

        double Sum(int fromDaysAgo, int toDaysAgo) => xpRows
            .Where(x => x.CreatedAt > now.AddDays(-fromDaysAgo) && x.CreatedAt <= now.AddDays(-toDaysAgo)).Sum(x => x.Amount);
        var last7 = Sum(7, 0);
        var prev7 = Sum(14, 7);
        var velocity = prev7 == 0 ? (last7 > 0 ? 100 : 0) : Math.Round(100.0 * (last7 - prev7) / prev7, 1);

        var progress = await db.UserTopicProgress.AsNoTracking().Where(p => p.UserId == userId)
            .Join(db.Topics, p => p.TopicId, t => t.Id, (p, t) => new { p, t.Slug, t.Name }).ToListAsync(ct);
        var tr = await localizer.LoadAsync(ct);
        var byTopic = progress.Select(x => new TopicAccuracyDto(x.Slug, tr.TopicName(x.p.TopicId, x.Name), x.p.QuestionsAnswered, x.p.CorrectAnswers, x.p.Accuracy))
            .OrderByDescending(t => t.Answered).ToList();

        var byDifficulty = new List<DifficultyBreakdownDto>
        {
            CatalogService.Breakdown(nameof(Difficulty.Easy), progress.Sum(x => x.p.EasyAnswered), progress.Sum(x => x.p.EasyCorrect)),
            CatalogService.Breakdown(nameof(Difficulty.Medium), progress.Sum(x => x.p.MediumAnswered), progress.Sum(x => x.p.MediumCorrect)),
            CatalogService.Breakdown(nameof(Difficulty.Hard), progress.Sum(x => x.p.HardAnswered), progress.Sum(x => x.p.HardCorrect)),
            CatalogService.Breakdown(nameof(Difficulty.Expert), progress.Sum(x => x.p.ExpertAnswered), progress.Sum(x => x.p.ExpertCorrect)),
        };

        var bySubtopic = await db.QuestionAttempts.AsNoTracking().Where(a => a.UserId == userId)
            .GroupBy(a => a.SubtopicId)
            .Select(g => new { g.Key, Answered = g.Count(), Correct = g.Count(a => a.IsCorrect) })
            .Join(db.Subtopics, g => g.Key, s => s.Id, (g, s) => new { g.Answered, g.Correct, s.Id, s.Slug, s.Name, TopicSlug = s.Topic!.Slug })
            .ToListAsync(ct);

        var (strongest, weakest) = TopicStrength.Classify(byTopic);
        var totalStudy = await db.QuestionAttempts.Where(a => a.UserId == userId).SumAsync(a => (int?)a.TimeSpentSeconds, ct) ?? 0;
        var periodXp = xpRows.Where(x => x.CreatedAt >= from).Sum(x => (long)x.Amount);

        return new AnalyticsDto(days, user.QuestionsAnswered, user.CorrectAnswers, user.GlobalAccuracy, totalStudy, periodXp,
            Domain.Gamification.StreakRules.Effective(user.LastActivityDate, user.CurrentStreak, today), user.LongestStreak,
            last7, prev7, velocity, byDifficulty, byTopic,
            bySubtopic.Select(s => new SubtopicAccuracyDto(s.TopicSlug, s.Slug, tr.SubtopicName(s.Id, s.Name), s.Answered, s.Correct,
                s.Answered == 0 ? 0 : Math.Round(100.0 * s.Correct / s.Answered, 1))).OrderByDescending(s => s.Answered).ToList(),
            daily, strongest, weakest);
    }
}
