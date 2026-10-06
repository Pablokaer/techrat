using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;

namespace TechRat.Application.Leaderboards;

public enum LeaderboardScope
{
    Global = 1,
    Weekly = 2,
    Monthly = 3,
    Topic = 4,
}

public sealed record LeaderboardEntryDto(
    int Rank, Guid UserId, string Username, string DisplayName, string? AvatarUrl, int Level, long Xp, int Questions, double Accuracy);

public sealed record LeaderboardDto(
    LeaderboardScope Scope, string? TopicSlug, DateTimeOffset? PeriodStart, int Page, int PageSize, int TotalCount,
    IReadOnlyList<LeaderboardEntryDto> Entries, LeaderboardEntryDto? Me);

public static class LeaderboardPeriods
{
    /// <summary>ISO week start (Monday 00:00 UTC).</summary>
    public static DateTimeOffset WeekStart(DateTimeOffset now)
    {
        var d = now.UtcDateTime.Date;
        var diff = ((int)d.DayOfWeek + 6) % 7;
        return new DateTimeOffset(d.AddDays(-diff), TimeSpan.Zero);
    }

    public static DateTimeOffset MonthStart(DateTimeOffset now) => new(now.UtcDateTime.Year, now.UtcDateTime.Month, 1, 0, 0, 0, TimeSpan.Zero);

    /// <summary>Standard competition ranking ("1224"): ties share a rank. Input must be sorted by score descending.</summary>
    public static List<int> CompetitionRanks(IReadOnlyList<long> sortedScores, int offsetRank = 1, long? previousScore = null, int previousRank = 0)
    {
        var ranks = new List<int>(sortedScores.Count);
        for (var i = 0; i < sortedScores.Count; i++)
        {
            if (i == 0 && previousScore == sortedScores[0]) ranks.Add(previousRank);
            else if (i > 0 && sortedScores[i] == sortedScores[i - 1]) ranks.Add(ranks[i - 1]);
            else ranks.Add(offsetRank + i);
        }
        return ranks;
    }
}

/// <summary>
/// PostgreSQL is the source of truth. Computed pages are cached in Redis for a short TTL so hot leaderboards
/// don't hit the database on every view; the caller's own position is always computed live.
/// </summary>
public sealed class LeaderboardService(IAppDbContext db, ICacheService cache, TimeProvider clock)
{
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(30);

    private sealed record Page(List<Row> Rows, int Total);

    // Member-init class (not a positional record) so EF Core can translate filters/orderings on the projection.
    private sealed class Row
    {
        public Guid UserId { get; init; }
        public string Username { get; init; } = "";
        public string DisplayName { get; init; } = "";
        public string? AvatarUrl { get; init; }
        public int Level { get; init; }
        public long Xp { get; init; }
        public int Questions { get; init; }
        public double Accuracy { get; init; }
    }

    public async Task<LeaderboardDto> GetAsync(LeaderboardScope scope, string? topicSlug, int? page, int? pageSize, Guid? me, CancellationToken ct)
    {
        var (p, size) = Paging.Normalize(page, pageSize, 100);
        var now = clock.GetUtcNow();
        DateTimeOffset? periodStart = scope switch
        {
            LeaderboardScope.Weekly => LeaderboardPeriods.WeekStart(now),
            LeaderboardScope.Monthly => LeaderboardPeriods.MonthStart(now),
            _ => null,
        };
        Guid? topicId = null;
        if (scope == LeaderboardScope.Topic)
        {
            if (string.IsNullOrWhiteSpace(topicSlug)) throw RequestValidationException.For("topic", Text.Get(Text.Keys.TopicLeaderboardNeedsTopic));
            topicId = await db.Topics.Where(t => t.Slug == topicSlug).Select(t => (Guid?)t.Id).FirstOrDefaultAsync(ct)
                ?? throw new NotFoundException("Topic", topicSlug);
        }

        var cached = await cache.GetOrCreateAsync(CacheKeys.Leaderboard(scope.ToString(), topicSlug, p, size), Ttl,
            async c => await LoadPageAsync(scope, topicId, periodStart, p, size, c), ct);
        var (rows, total) = (cached.Rows, cached.Total);
        // A page may be cached for 30 s: learners who opted out meanwhile disappear at once (coming back takes the TTL).
        var ids = rows.Select(r => r.UserId).ToList();
        var hidden = await db.UserProfiles.AsNoTracking().Where(u => ids.Contains(u.Id) && !u.ShowOnLeaderboard).Select(u => u.Id).ToListAsync(ct);
        if (hidden.Count > 0) rows = rows.Where(r => !hidden.Contains(r.UserId)).ToList();

        long? prevScore = null; var prevRank = 0;
        if (p > 1 && rows.Count > 0)
        {
            // Ties that span the page boundary must share the rank from the previous page.
            var higher = await CountHigherAsync(scope, topicId, periodStart, rows[0].Xp, ct);
            prevScore = rows[0].Xp; prevRank = higher + 1;
        }
        var ranks = LeaderboardPeriods.CompetitionRanks(rows.Select(r => r.Xp).ToList(), (p - 1) * size + 1, prevScore, prevRank);
        var entries = rows.Select((r, i) => new LeaderboardEntryDto(ranks[i], r.UserId, r.Username, r.DisplayName, r.AvatarUrl, r.Level, r.Xp, r.Questions, r.Accuracy)).ToList();

        LeaderboardEntryDto? mine = null;
        if (me is { } uid) mine = await MeAsync(scope, topicId, periodStart, uid, ct);
        return new LeaderboardDto(scope, topicSlug, periodStart, p, size, total, entries, mine);
    }

    private IQueryable<Row> Query(LeaderboardScope scope, Guid? topicId, DateTimeOffset? periodStart) => scope switch
    {
        LeaderboardScope.Global => db.UserProfiles.AsNoTracking().Where(u => u.ShowOnLeaderboard && u.CurrentGlobalXP > 0)
            .Select(u => new Row { UserId = u.Id, Username = u.Username, DisplayName = u.DisplayName, AvatarUrl = u.AvatarUrl, Level = u.CurrentGlobalLevel, Xp = u.CurrentGlobalXP, Questions = u.QuestionsAnswered, Accuracy = u.GlobalAccuracy }),
        LeaderboardScope.Topic => db.UserTopicProgress.AsNoTracking().Where(t => t.TopicId == topicId && t.XP > 0)
            .Join(db.UserProfiles.Where(u => u.ShowOnLeaderboard), t => t.UserId, u => u.Id, (t, u) => new Row { UserId = u.Id, Username = u.Username, DisplayName = u.DisplayName, AvatarUrl = u.AvatarUrl, Level = t.Level, Xp = t.XP, Questions = t.QuestionsAnswered, Accuracy = t.Accuracy }),
        _ => db.XPTransactions.AsNoTracking().Where(x => x.CreatedAt >= periodStart)
            .GroupBy(x => x.UserId).Select(g => new { UserId = g.Key, Xp = g.Sum(x => (long)x.Amount) })
            .Join(db.UserProfiles.Where(u => u.ShowOnLeaderboard), g => g.UserId, u => u.Id, (g, u) => new Row { UserId = u.Id, Username = u.Username, DisplayName = u.DisplayName, AvatarUrl = u.AvatarUrl, Level = u.CurrentGlobalLevel, Xp = g.Xp, Questions = u.QuestionsAnswered, Accuracy = u.GlobalAccuracy }),
    };

    private async Task<Page> LoadPageAsync(LeaderboardScope scope, Guid? topicId, DateTimeOffset? periodStart, int page, int size, CancellationToken ct)
    {
        var q = Query(scope, topicId, periodStart);
        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(r => r.Xp).ThenBy(r => r.Username).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return new Page(rows, total);
    }

    private Task<int> CountHigherAsync(LeaderboardScope scope, Guid? topicId, DateTimeOffset? periodStart, long xp, CancellationToken ct) =>
        Query(scope, topicId, periodStart).CountAsync(r => r.Xp > xp, ct);

    private async Task<LeaderboardEntryDto?> MeAsync(LeaderboardScope scope, Guid? topicId, DateTimeOffset? periodStart, Guid userId, CancellationToken ct)
    {
        var row = await Query(scope, topicId, periodStart).FirstOrDefaultAsync(r => r.UserId == userId, ct);
        if (row is null) return null;
        var rank = await CountHigherAsync(scope, topicId, periodStart, row.Xp, ct) + 1;
        return new LeaderboardEntryDto(rank, row.UserId, row.Username, row.DisplayName, row.AvatarUrl, row.Level, row.Xp, row.Questions, row.Accuracy);
    }

    public async Task<int> GlobalRankAsync(Guid userId, CancellationToken ct)
    {
        var xp = await db.UserProfiles.Where(u => u.Id == userId).Select(u => u.CurrentGlobalXP).FirstAsync(ct);
        // Learners who opted out take no rank from anyone.
        return await db.UserProfiles.CountAsync(u => u.ShowOnLeaderboard && u.CurrentGlobalXP > xp, ct) + 1;
    }
}
