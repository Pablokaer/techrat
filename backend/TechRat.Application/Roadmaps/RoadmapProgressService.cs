using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Application.Gamification;
using TechRat.Domain.Common;
using TechRat.Domain.Roadmaps;
using TechRat.Domain.Users;

namespace TechRat.Application.Roadmaps;

public sealed record StepCriteriaResult(int AnsweredQuestions, int CorrectQuestions, double Accuracy, int RequiredQuestions, int RequiredAccuracy, bool IsMet);

public static class StepCriteria
{
    /// <summary>
    /// A step is met when the learner answered at least <paramref name="minQuestions"/> distinct questions in scope
    /// and, using their latest attempt on each, reached <paramref name="minAccuracy"/>%.
    /// Using the latest attempt lets learners recover from early mistakes but still requires current knowledge.
    /// </summary>
    public static StepCriteriaResult Evaluate(IReadOnlyCollection<bool> latestAttemptPerQuestion, int minQuestions, int minAccuracy)
    {
        var answered = latestAttemptPerQuestion.Count;
        var correct = latestAttemptPerQuestion.Count(x => x);
        var accuracy = answered == 0 ? 0 : Math.Round(100.0 * correct / answered, 1);
        var met = answered >= Math.Max(1, minQuestions) && accuracy >= minAccuracy;
        return new StepCriteriaResult(answered, correct, accuracy, minQuestions, minAccuracy, met);
    }
}

public static class RoadmapUnlock
{
    public static bool IsUnlocked(IEnumerable<(int MinimumPercent, double ActualPercent)> dependencies) =>
        dependencies.All(d => d.ActualPercent >= d.MinimumPercent);
}

public sealed record CompletedStepDto(Guid RoadmapId, string RoadmapName, Guid StepId, string StepTitle, int XpEarned, bool ModuleCompleted, bool RoadmapCompleted);

public sealed class RoadmapProgressService(
    IAppDbContext db, XpService xp, ContentLocalizer localizer, IOptions<GamificationOptions> options, TimeProvider clock)
{
    private readonly GamificationOptions _options = options.Value;

    public async Task<StepCriteriaResult> EvaluateStepAsync(Guid userId, RoadmapStep step, CancellationToken ct)
    {
        var attempts = db.QuestionAttempts.Where(a => a.UserId == userId && a.TopicId == step.TopicId);
        if (step.SubtopicId is { } sub) attempts = attempts.Where(a => a.SubtopicId == sub);

        var latest = await attempts
            .GroupBy(a => a.QuestionId)
            .Select(g => g.OrderByDescending(a => a.AnsweredAt).Select(a => a.IsCorrect).First())
            .ToListAsync(ct);

        return StepCriteria.Evaluate(latest, step.MinimumQuestions, step.MinimumAccuracy);
    }

    public async Task<Dictionary<Guid, double>> CompletionPercentAsync(Guid userId, IEnumerable<Guid> roadmapIds, CancellationToken ct)
    {
        var ids = roadmapIds.Distinct().ToList();
        var counts = await db.Roadmaps.Where(r => ids.Contains(r.Id)).Select(r => new { r.Id, r.StepsCount }).ToListAsync(ct);
        var done = await db.UserRoadmapStepCompletions.Where(c => c.UserId == userId && ids.Contains(c.RoadmapId))
            .GroupBy(c => c.RoadmapId).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        return counts.ToDictionary(c => c.Id, c =>
        {
            var d = done.FirstOrDefault(x => x.Key == c.Id)?.Count ?? 0;
            return c.StepsCount == 0 ? 0 : Math.Round(100.0 * d / c.StepsCount, 1);
        });
    }

    public async Task<bool> IsUnlockedAsync(Guid userId, Guid roadmapId, CancellationToken ct)
    {
        var deps = await db.RoadmapDependencies.Where(d => d.RoadmapId == roadmapId).ToListAsync(ct);
        if (deps.Count == 0) return true;
        var pct = await CompletionPercentAsync(userId, deps.Select(d => d.RequiredRoadmapId), ct);
        return RoadmapUnlock.IsUnlocked(deps.Select(d => (d.MinimumPercent, pct.GetValueOrDefault(d.RequiredRoadmapId))));
    }

    /// <summary>
    /// Advances every in-progress roadmap of the user: the current step completes only when its criteria are met,
    /// which unlocks (and immediately evaluates) the following step. Optionally restricted to roadmaps whose current
    /// step covers <paramref name="topicId"/>. Caller saves.
    /// </summary>
    public async Task<List<CompletedStepDto>> AdvanceAsync(User user, Guid? topicId, CancellationToken ct)
    {
        var results = new List<CompletedStepDto>();
        var active = await db.UserRoadmapProgress.Where(p => p.UserId == user.Id && p.CompletedAt == null).ToListAsync(ct);

        foreach (var progress in active)
        {
            var roadmap = await db.Roadmaps.AsNoTracking().FirstAsync(r => r.Id == progress.RoadmapId, ct);
            var steps = await db.RoadmapSteps.AsNoTracking().Where(s => s.RoadmapId == roadmap.Id).OrderBy(s => s.Order).ToListAsync(ct);
            var completed = (await db.UserRoadmapStepCompletions
                .Where(c => c.UserId == user.Id && c.RoadmapId == roadmap.Id).Select(c => c.RoadmapStepId).ToListAsync(ct)).ToHashSet();

            var first = true;
            foreach (var step in steps.Where(s => !completed.Contains(s.Id)))
            {
                // Only the trigger topic matters for the first pending step; once one completes, follow-ups are evaluated regardless.
                if (first && topicId is not null && step.TopicId != topicId) break;
                first = false;

                var criteria = await EvaluateStepAsync(user.Id, step, ct);
                if (!criteria.IsMet)
                {
                    progress.CurrentStepId = step.Id;
                    break;
                }

                var now = clock.GetUtcNow();
                db.UserRoadmapStepCompletions.Add(new UserRoadmapStepCompletion
                { UserId = user.Id, RoadmapStepId = step.Id, RoadmapId = roadmap.Id, CompletedAt = now });
                completed.Add(step.Id);
                progress.CompletedSteps = completed.Count;
                progress.LastActivityAt = now;
                progress.CurrentStepId = steps.FirstOrDefault(s => !completed.Contains(s.Id))?.Id;

                var earned = xp.Award(user, step.XPReward, XpReason.RoadmapStepCompleted, XpSourceType.RoadmapStep, step.Id).Amount;

                var moduleDone = steps.Where(s => s.ModuleId == step.ModuleId).All(s => completed.Contains(s.Id));
                if (moduleDone)
                {
                    var module = await db.RoadmapModules.AsNoTracking().FirstAsync(m => m.Id == step.ModuleId, ct);
                    earned += xp.Award(user, module.XPReward, XpReason.RoadmapModuleCompleted, XpSourceType.RoadmapModule, module.Id).Amount;
                }

                var roadmapDone = completed.Count >= steps.Count;
                if (roadmapDone)
                {
                    progress.CompletedAt = now;
                    earned += xp.Award(user, roadmap.XPReward, XpReason.RoadmapCompleted, XpSourceType.Roadmap, roadmap.Id).Amount;
                }

                var tr = await localizer.LoadAsync(ct);
                results.Add(new CompletedStepDto(roadmap.Id, tr.RoadmapName(roadmap.Id, roadmap.Name), step.Id, tr.StepTitle(step.Id, step.Title),
                    earned, moduleDone, roadmapDone));
            }
        }
        return results;
    }
}
