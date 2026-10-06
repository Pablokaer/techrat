using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Domain.Common;
using TechRat.Domain.Practice;

namespace TechRat.Application.Practice;

/// <summary>Same mixed-topic set of questions for everyone on a given UTC day. Bonus XP is paid once per day.</summary>
public sealed class DailyChallengeService(IAppDbContext db, PracticeService practice, IOptions<GamificationOptions> options, TimeProvider clock)
{
    private DateOnly Today => DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

    /// <summary>Deterministic pick: one question per distinct topic, seeded by the date.</summary>
    public static List<Guid> Pick(IReadOnlyList<CandidateQuestion> pool, DateOnly date, int count)
    {
        var rng = new Random(date.DayNumber);
        var shuffled = pool.OrderBy(q => q.Id).Select(q => (q, r: rng.Next())).OrderBy(x => x.r).Select(x => x.q).ToList();
        var picked = new List<CandidateQuestion>();
        var topics = new HashSet<Guid>();
        foreach (var q in shuffled.Where(q => q.Difficulty != Difficulty.Expert))
        {
            if (picked.Count == count) break;
            if (topics.Add(q.TopicId)) picked.Add(q);
        }
        return picked.OrderBy(q => q.Difficulty).Select(q => q.Id).ToList();
    }

    public async Task<DailyChallengeStatusDto> GetStatusAsync(Guid userId, CancellationToken ct)
    {
        var today = Today;
        var completion = await db.DailyChallengeCompletions.AsNoTracking().FirstOrDefaultAsync(d => d.UserId == userId && d.Date == today, ct);
        var session = await db.PracticeSessions.AsNoTracking()
            .Where(s => s.UserId == userId && s.Mode == PracticeMode.DailyChallenge && s.ChallengeDate == today)
            .OrderByDescending(s => s.StartedAt).FirstOrDefaultAsync(ct);
        return new DailyChallengeStatusDto(today, completion is not null, session?.Id, options.Value.DailyChallengeSize,
            session?.AnsweredCount ?? 0, session?.CorrectCount ?? 0, options.Value.DailyChallengeBonusXp);
    }

    public async Task<PracticeSessionDto> StartAsync(Guid userId, CancellationToken ct)
    {
        var today = Today;
        var existing = await db.PracticeSessions.AsNoTracking()
            .Where(s => s.UserId == userId && s.Mode == PracticeMode.DailyChallenge && s.ChallengeDate == today)
            .Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);
        if (existing is { } id) return await practice.GetAsync(userId, id, ct);

        var pool = await db.Questions.AsNoTracking().Where(q => q.IsActive && q.QuestionType == QuestionType.MultipleChoice)
            .Select(q => new CandidateQuestion(q.Id, q.Difficulty, q.TopicId)).ToListAsync(ct);
        var ids = Pick(pool, today, options.Value.DailyChallengeSize);
        if (ids.Count == 0) throw new NotFoundException("Daily challenge", today);

        var session = new PracticeSession
        {
            UserId = userId, Mode = PracticeMode.DailyChallenge, ChallengeDate = today, QuestionIds = ids, StartedAt = clock.GetUtcNow(),
        };
        db.PracticeSessions.Add(session);
        await db.SaveChangesAsync(ct);
        return await practice.GetAsync(userId, session.Id, ct);
    }
}
