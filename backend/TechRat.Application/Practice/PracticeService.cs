using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Application.Gamification;
using TechRat.Application.Roadmaps;
using TechRat.Domain.Common;
using TechRat.Domain.Gamification;
using TechRat.Domain.Practice;
using TechRat.Domain.Users;

namespace TechRat.Application.Practice;

public sealed class PracticeService(
    IAppDbContext db,
    XpService xp,
    LevelService levels,
    RoadmapProgressService roadmapProgress,
    ContentLocalizer localizer,
    IOutboxSignal outboxSignal,
    IOptions<GamificationOptions> options,
    TimeProvider clock,
    ILogger<PracticeService> logger)
{
    private readonly GamificationOptions _options = options.Value;
    public const int MaxQuestionsPerSession = 50;

    // ------------------------------------------------------------------ start

    public async Task<PracticeSessionDto> StartAsync(Guid userId, StartPracticeRequest request, CancellationToken ct)
    {
        if (request.Mode == PracticeMode.DailyChallenge)
            throw RequestValidationException.For("mode", Text.Get(Text.Keys.UseDailyChallengeEndpoint));
        var count = Math.Clamp(request.Count ?? 10, 1, MaxQuestionsPerSession);

        Guid? topicId = null, subtopicId = null;
        var difficulty = request.Difficulty;
        var mode = request.Mode;

        if (request.RoadmapStepId is { } stepId)
        {
            var step = await db.RoadmapSteps.AsNoTracking().FirstOrDefaultAsync(s => s.Id == stepId, ct)
                ?? throw new NotFoundException("Roadmap step", stepId);
            topicId = step.TopicId;
            subtopicId = step.SubtopicId;
            mode = PracticeMode.Roadmap;
            count = Math.Max(count, step.MinimumQuestions);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request.TopicSlug))
            {
                topicId = await db.Topics.Where(t => t.Slug == request.TopicSlug && t.IsActive).Select(t => (Guid?)t.Id).FirstOrDefaultAsync(ct)
                    ?? throw new NotFoundException("Topic", request.TopicSlug);
                if (!string.IsNullOrWhiteSpace(request.SubtopicSlug))
                    subtopicId = await db.Subtopics.Where(s => s.TopicId == topicId && s.Slug == request.SubtopicSlug).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct)
                        ?? throw new NotFoundException("Subtopic", request.SubtopicSlug);
            }
            else if (mode is PracticeMode.Practice or PracticeMode.Challenge)
            {
                throw RequestValidationException.For("topicSlug", Text.Get(Text.Keys.ChooseTopic));
            }
        }

        var query = db.Questions.AsNoTracking().Where(q => q.IsActive && q.QuestionType == QuestionType.MultipleChoice);
        if (topicId is not null) query = query.Where(q => q.TopicId == topicId);
        if (subtopicId is not null) query = query.Where(q => q.SubtopicId == subtopicId);
        if (difficulty is not null && mode != PracticeMode.Adaptive) query = query.Where(q => q.Difficulty == difficulty);
        if (mode == PracticeMode.Challenge && difficulty is null) query = query.Where(q => q.Difficulty != Difficulty.Easy);

        var candidates = await query.Select(q => new CandidateQuestion(q.Id, q.Difficulty, q.TopicId)).ToListAsync(ct);
        if (candidates.Count == 0)
            throw RequestValidationException.For("topicSlug", Text.Get(Text.Keys.NoQuestionsAvailable));

        var candidateIds = candidates.Select(c => c.Id).ToList();
        var latest = await db.QuestionAttempts.AsNoTracking()
            .Where(a => a.UserId == userId && candidateIds.Contains(a.QuestionId))
            .GroupBy(a => a.QuestionId)
            .Select(g => new { g.Key, IsCorrect = g.OrderByDescending(a => a.AnsweredAt).Select(a => a.IsCorrect).First() })
            .ToDictionaryAsync(x => x.Key, x => x.IsCorrect, ct);

        var rng = Random.Shared;
        List<Guid> chosen;
        if (mode == PracticeMode.Adaptive)
        {
            var stats = await DifficultyStatsAsync(userId, topicId, ct);
            var allocation = AdaptiveDifficultyPolicy.Allocate(AdaptiveDifficultyPolicy.Weights(stats), count);
            chosen = QuestionPicker.PickByAllocation(QuestionPicker.Prioritise(candidates, latest, rng), allocation, count);
        }
        else if (mode == PracticeMode.Random)
        {
            chosen = candidates.OrderBy(_ => rng.Next()).Take(count).Select(c => c.Id).ToList();
        }
        else
        {
            var prioritised = QuestionPicker.Prioritise(candidates, latest, rng).Take(count).ToList();
            chosen = prioritised.OrderBy(c => c.Difficulty).Select(c => c.Id).ToList();
        }

        var session = new PracticeSession
        {
            UserId = userId,
            Mode = mode,
            TopicId = topicId,
            SubtopicId = subtopicId,
            Difficulty = mode == PracticeMode.Adaptive ? null : difficulty,
            RoadmapStepId = request.RoadmapStepId,
            QuestionIds = chosen,
            StartedAt = clock.GetUtcNow(),
        };
        db.PracticeSessions.Add(session);
        await db.SaveChangesAsync(ct);
        return await GetAsync(userId, session.Id, ct);
    }

    private async Task<Dictionary<Difficulty, DifficultyStats>> DifficultyStatsAsync(Guid userId, Guid? topicId, CancellationToken ct)
    {
        var q = db.UserTopicProgress.AsNoTracking().Where(p => p.UserId == userId);
        if (topicId is not null) q = q.Where(p => p.TopicId == topicId);
        var rows = await q.ToListAsync(ct);
        return new()
        {
            [Difficulty.Easy] = new(rows.Sum(r => r.EasyAnswered), rows.Sum(r => r.EasyCorrect)),
            [Difficulty.Medium] = new(rows.Sum(r => r.MediumAnswered), rows.Sum(r => r.MediumCorrect)),
            [Difficulty.Hard] = new(rows.Sum(r => r.HardAnswered), rows.Sum(r => r.HardCorrect)),
            [Difficulty.Expert] = new(rows.Sum(r => r.ExpertAnswered), rows.Sum(r => r.ExpertCorrect)),
        };
    }

    // ------------------------------------------------------------------ read

    public async Task<PracticeSessionDto> GetAsync(Guid userId, Guid sessionId, CancellationToken ct)
    {
        var s = await db.PracticeSessions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == sessionId && x.UserId == userId, ct)
            ?? throw new NotFoundException("Practice session", sessionId);

        var questions = await db.Questions.AsNoTracking()
            .Where(q => s.QuestionIds.Contains(q.Id))
            .Select(q => new
            {
                q.Id, q.Difficulty, q.Title, q.QuestionText, q.XPReward, q.Explanation, q.ReferenceUrl,
                q.TopicId, q.SubtopicId, TopicSlug = q.Topic!.Slug, TopicName = q.Topic.Name, SubSlug = q.Subtopic!.Slug, SubName = q.Subtopic.Name,
                Options = q.Options.OrderBy(o => o.DisplayOrder).Select(o => new { o.Id, o.Text, o.IsCorrect }).ToList(),
            })
            .ToListAsync(ct);

        var attempts = await db.QuestionAttempts.AsNoTracking()
            .Where(a => a.PracticeSessionId == sessionId)
            .ToDictionaryAsync(a => a.QuestionId, ct);

        var tr = await localizer.LoadAsync(ct);
        var byId = questions.ToDictionary(q => q.Id);
        var items = s.QuestionIds.Where(byId.ContainsKey).Select((id, index) =>
        {
            var q = byId[id];
            AnswerFeedbackDto? answer = null;
            if (attempts.TryGetValue(id, out var a))
                answer = new AnswerFeedbackDto(a.SelectedOptionId, q.Options.First(o => o.IsCorrect).Id, a.IsCorrect, q.Explanation, q.ReferenceUrl, a.XpEarned);
            return new SessionQuestionDto(q.Id, index + 1, q.TopicSlug, tr.TopicName(q.TopicId, q.TopicName), q.SubSlug,
                tr.SubtopicName(q.SubtopicId, q.SubName), q.Difficulty, q.Title,
                q.QuestionText, q.XPReward, q.Options.Select(o => new OptionDto(o.Id, o.Text)).ToList(), answer);
        }).ToList();

        string? topicSlug = null, topicName = null, subSlug = null, subName = null;
        if (s.TopicId is { } tid)
        {
            var t = await db.Topics.AsNoTracking().Where(x => x.Id == tid).Select(x => new { x.Slug, x.Name }).FirstAsync(ct);
            (topicSlug, topicName) = (t.Slug, tr.TopicName(tid, t.Name));
        }
        if (s.SubtopicId is { } sid)
        {
            var st = await db.Subtopics.AsNoTracking().Where(x => x.Id == sid).Select(x => new { x.Slug, x.Name }).FirstAsync(ct);
            (subSlug, subName) = (st.Slug, tr.SubtopicName(sid, st.Name));
        }

        return new PracticeSessionDto(s.Id, s.Mode, topicSlug, topicName, subSlug, subName, s.Difficulty, s.RoadmapStepId,
            s.Mode == PracticeMode.DailyChallenge, s.QuestionIds.Count, s.AnsweredCount, s.CorrectCount, s.XpEarned,
            s.StartedAt, s.CompletedAt, items);
    }

    // ------------------------------------------------------------------ answer

    public async Task<AnswerResultDto> SubmitAnswerAsync(Guid userId, Guid sessionId, SubmitAnswerRequest request, CancellationToken ct)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                var result = await SubmitOnceAsync(userId, sessionId, request, ct);
                outboxSignal.Notify();
                return result;
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                logger.LogInformation("Concurrency conflict while grading answer, retrying ({Attempt})", attempt);
                db.ClearChanges();
            }
            catch (DbUpdateException ex) when (ex is not DbUpdateConcurrencyException && IsUniqueViolation(ex))
            {
                db.ClearChanges();
                throw new ConflictException(Text.Get(Text.Keys.AlreadyAnswered));
            }
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException?.GetType().GetProperty("SqlState")?.GetValue(ex.InnerException) as string == "23505";

    private async Task<AnswerResultDto> SubmitOnceAsync(Guid userId, Guid sessionId, SubmitAnswerRequest request, CancellationToken ct)
    {
        await using var tx = await db.BeginTransactionAsync(ct);
        var now = clock.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);

        var session = await db.PracticeSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct)
            ?? throw new NotFoundException("Practice session", sessionId);
        if (!session.QuestionIds.Contains(request.QuestionId))
            throw RequestValidationException.For("questionId", Text.Get(Text.Keys.QuestionNotInSession));
        if (await db.QuestionAttempts.AnyAsync(a => a.PracticeSessionId == sessionId && a.QuestionId == request.QuestionId, ct))
            throw new ConflictException(Text.Get(Text.Keys.AlreadyAnswered));

        var question = await db.Questions.AsNoTracking().Include(q => q.Options).Include(q => q.Topic)
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, ct) ?? throw new NotFoundException("Question", request.QuestionId);
        var selected = question.Options.FirstOrDefault(o => o.Id == request.SelectedOptionId)
            ?? throw RequestValidationException.For("selectedOptionId", Text.Get(Text.Keys.OptionNotInQuestion));
        var correct = question.Options.Single(o => o.IsCorrect);
        var isCorrect = selected.Id == correct.Id;

        // XP is granted once per question: replaying a question you already solved does not farm XP.
        var alreadySolved = await db.QuestionAttempts.AnyAsync(a => a.UserId == userId && a.QuestionId == question.Id && a.IsCorrect, ct);
        var questionXp = isCorrect && !alreadySolved ? question.XPReward : 0;

        var user = await db.UserProfiles.FirstAsync(u => u.Id == userId, ct);
        var topicProgress = await db.UserTopicProgress.FirstOrDefaultAsync(p => p.UserId == userId && p.TopicId == question.TopicId, ct);
        if (topicProgress is null)
        {
            topicProgress = new UserTopicProgress { UserId = userId, TopicId = question.TopicId };
            db.UserTopicProgress.Add(topicProgress);
        }

        var previousLevel = user.CurrentGlobalLevel;
        var previousTopicLevel = topicProgress.Level;
        var bonusXp = 0;

        // Streak
        var streak = StreakRules.Apply(user.LastActivityDate, user.CurrentStreak, user.LongestStreak, today);
        (user.CurrentStreak, user.LongestStreak, user.LastActivityDate) = (streak.Current, streak.Longest, today);
        if (streak.IncrementedToday)
            bonusXp += xp.Award(user, _options.DailyStreakXp, XpReason.DailyStreak, XpSourceType.Streak, null).Amount;

        // Stats + XP
        user.RecordAnswer(isCorrect);
        topicProgress.RecordAnswer(question.Difficulty, isCorrect, now);
        if (questionXp > 0)
            xp.Award(user, questionXp, XpReason.CorrectAnswer, XpSourceType.Question, question.Id, topicProgress);

        db.QuestionAttempts.Add(new QuestionAttempt
        {
            UserId = userId,
            QuestionId = question.Id,
            SelectedOptionId = selected.Id,
            IsCorrect = isCorrect,
            TimeSpentSeconds = Math.Clamp(request.TimeSpentSeconds, 0, 3600),
            Difficulty = question.Difficulty,
            XpEarned = questionXp,
            AnsweredAt = now,
            PracticeSessionId = sessionId,
            TopicId = question.TopicId,
            SubtopicId = question.SubtopicId,
        });

        session.AnsweredCount++;
        if (isCorrect) session.CorrectCount++;
        session.XpEarned += questionXp;

        // Daily challenge bonus (once per day, enforced by unique key UserId+Date).
        var dailyBonus = 0;
        if (session.IsComplete && session.CompletedAt is null)
        {
            session.CompletedAt = now;
            if (session.Mode == PracticeMode.DailyChallenge && session.ChallengeDate is { } date
                && !await db.DailyChallengeCompletions.AnyAsync(d => d.UserId == userId && d.Date == date, ct))
            {
                dailyBonus = xp.Award(user, _options.DailyChallengeBonusXp, XpReason.ChallengeCompleted, XpSourceType.DailyChallenge, session.Id).Amount;
                db.DailyChallengeCompletions.Add(new DailyChallengeCompletion
                {
                    UserId = userId, Date = date, PracticeSessionId = session.Id, CorrectCount = session.CorrectCount,
                    BonusXp = dailyBonus, CompletedAt = now,
                });
                session.XpEarned += dailyBonus;
            }
        }

        await db.SaveChangesAsync(ct);

        // Roadmap steps are evaluated against persisted attempts (including this one).
        var completedSteps = await roadmapProgress.AdvanceAsync(user, question.TopicId, ct);
        bonusXp += completedSteps.Sum(s => s.XpEarned);

        db.Enqueue(OutboxEvents.UserProgressChanged, new UserProgressChanged(userId, question.TopicId, "answer"), now);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var levelInfo = levels.Evaluate(user.CurrentGlobalXP);
        return new AnswerResultDto(
            new AnswerFeedbackDto(selected.Id, correct.Id, isCorrect, question.Explanation, question.ReferenceUrl, questionXp),
            bonusXp,
            user.CurrentGlobalXP,
            LevelDto.From(levelInfo),
            user.CurrentGlobalLevel > previousLevel,
            question.Topic!.Slug,
            topicProgress.Level,
            topicProgress.XP,
            topicProgress.Level > previousTopicLevel,
            user.CurrentStreak,
            streak.IncrementedToday,
            dailyBonus,
            new SessionProgressDto(session.AnsweredCount, session.QuestionIds.Count, session.CorrectCount, session.XpEarned, session.IsComplete),
            completedSteps);
    }
}
