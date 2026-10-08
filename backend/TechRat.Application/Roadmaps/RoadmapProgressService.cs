using Microsoft.EntityFrameworkCore;
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
    /// <summary>Administrators review all content, so they never need to meet a roadmap's prerequisites.</summary>
    public static bool IsUnlocked(IEnumerable<(int MinimumPercent, double ActualPercent)> dependencies, bool isAdmin = false) =>
        isAdmin || dependencies.All(d => d.ActualPercent >= d.MinimumPercent);
}

/// <summary>A module's place in a roadmap.</summary>
public sealed record RoadmapLink(Guid RoadmapId, Guid ModuleId, int Order, bool IsRequired);

/// <summary>Pure composition rules (ADR-0012). Kept free of I/O so they are unit-tested directly.</summary>
public static class RoadmapComposition
{
    /// <summary>
    /// Modules a learner can work on in a roadmap: the first uncompleted required module (earlier required modules must be
    /// complete), any uncompleted required module already started elsewhere, and every uncompleted optional module
    /// (optional modules never block).
    /// </summary>
    public static IReadOnlyList<Guid> OpenModules(IEnumerable<RoadmapLink> links, IReadOnlySet<Guid> completedModules, IReadOnlySet<Guid> startedModules)
    {
        var open = new List<Guid>();
        var blocked = false;
        foreach (var link in links.OrderBy(l => l.Order))
        {
            if (completedModules.Contains(link.ModuleId)) continue;
            if (!link.IsRequired) { open.Add(link.ModuleId); continue; }
            if (!blocked || startedModules.Contains(link.ModuleId)) open.Add(link.ModuleId);
            blocked = true;
        }
        return open;
    }

    /// <summary>
    /// Progress of a roadmap: completed steps of required modules over all steps of required modules.
    /// A completed module counts as fully done even if steps were added after it was completed (new content never revokes).
    /// </summary>
    public static (int CompletedSteps, int TotalSteps, double Percent) Progress(
        IEnumerable<RoadmapLink> links, IReadOnlyDictionary<Guid, int> stepsPerModule,
        IReadOnlyDictionary<Guid, int> completedStepsPerModule, IReadOnlySet<Guid> completedModules)
    {
        int done = 0, total = 0;
        foreach (var link in links.Where(l => l.IsRequired))
        {
            var steps = stepsPerModule.GetValueOrDefault(link.ModuleId);
            total += steps;
            done += completedModules.Contains(link.ModuleId) ? steps : Math.Min(steps, completedStepsPerModule.GetValueOrDefault(link.ModuleId));
        }
        return (done, total, total == 0 ? 0 : Math.Round(100.0 * done / total, 1));
    }

    public static bool IsCompleted(IEnumerable<RoadmapLink> links, IReadOnlySet<Guid> completedModules) =>
        links.Where(l => l.IsRequired).All(l => completedModules.Contains(l.ModuleId));

    /// <summary>The next step of a module: steps unlock in order, so it is the first step not yet completed.</summary>
    public static ModuleStep? CurrentStep(IEnumerable<ModuleStep> steps, IReadOnlySet<Guid> completedSteps) =>
        steps.OrderBy(s => s.Order).FirstOrDefault(s => !completedSteps.Contains(s.Id));
}

public sealed record CompletedStepDto(
    Guid RoadmapId, string RoadmapName, Guid StepId, string StepTitle, int XpEarned, bool ModuleCompleted, bool RoadmapCompleted,
    string ModuleSlug, string ModuleName);

/// <summary>Everything about one learner's progress over a set of modules, loaded with a fixed number of queries.</summary>
public sealed class ModuleProgressSnapshot
{
    public required Dictionary<Guid, List<ModuleStep>> StepsByModule { get; init; }
    public required HashSet<Guid> CompletedSteps { get; init; }
    public required Dictionary<Guid, UserModuleProgress> ModuleProgress { get; init; }

    public IReadOnlySet<Guid> CompletedModules => ModuleProgress.Values.Where(p => p.CompletedAt != null).Select(p => p.ModuleId).ToHashSet();
    public IReadOnlySet<Guid> StartedModules => ModuleProgress.Keys.ToHashSet();
    public IReadOnlyDictionary<Guid, int> StepsPerModule => StepsByModule.ToDictionary(kv => kv.Key, kv => kv.Value.Count);
    public IReadOnlyDictionary<Guid, int> CompletedStepsPerModule =>
        StepsByModule.ToDictionary(kv => kv.Key, kv => kv.Value.Count(s => CompletedSteps.Contains(s.Id)));
    public List<ModuleStep> Steps(Guid moduleId) => StepsByModule.GetValueOrDefault(moduleId) ?? [];
}

public sealed class RoadmapProgressService(IAppDbContext db, XpService xp, ContentLocalizer localizer, TimeProvider clock)
{
    private sealed record AttemptRow(Guid TopicId, Guid SubtopicId, bool IsCorrect);

    public async Task<StepCriteriaResult> EvaluateStepAsync(Guid userId, ModuleStep step, CancellationToken ct)
    {
        var rows = await LatestAttemptsAsync(userId, [step.TopicId], ct);
        return Evaluate(step, rows);
    }

    /// <summary>Criteria of several steps with one attempts query.</summary>
    public async Task<Dictionary<Guid, StepCriteriaResult>> EvaluateStepsAsync(Guid userId, IReadOnlyCollection<ModuleStep> steps, CancellationToken ct)
    {
        if (steps.Count == 0) return [];
        var rows = await LatestAttemptsAsync(userId, steps.Select(s => s.TopicId).Distinct().ToList(), ct);
        return steps.ToDictionary(s => s.Id, s => Evaluate(s, rows));
    }

    private static StepCriteriaResult Evaluate(ModuleStep step, List<AttemptRow> rows) =>
        StepCriteria.Evaluate(
            rows.Where(r => r.TopicId == step.TopicId && (step.SubtopicId == null || r.SubtopicId == step.SubtopicId)).Select(r => r.IsCorrect).ToList(),
            step.MinimumQuestions, step.MinimumAccuracy);

    /// <summary>Latest attempt per question for the given topics (one query).</summary>
    private Task<List<AttemptRow>> LatestAttemptsAsync(Guid userId, IReadOnlyCollection<Guid> topicIds, CancellationToken ct) =>
        db.QuestionAttempts.Where(a => a.UserId == userId && topicIds.Contains(a.TopicId))
            .GroupBy(a => new { a.QuestionId, a.TopicId, a.SubtopicId })
            .Select(g => new AttemptRow(g.Key.TopicId, g.Key.SubtopicId, g.OrderByDescending(a => a.AnsweredAt).Select(a => a.IsCorrect).First()))
            .ToListAsync(ct);

    /// <summary>Loads steps, completions and module progress of <paramref name="moduleIds"/> for a learner (3 queries).</summary>
    public async Task<ModuleProgressSnapshot> SnapshotAsync(Guid userId, IReadOnlyCollection<Guid> moduleIds, bool track, CancellationToken ct)
    {
        var steps = await db.ModuleSteps.AsNoTracking().Where(s => moduleIds.Contains(s.ModuleId) && s.IsActive).ToListAsync(ct);
        var completed = await db.UserModuleStepCompletions.AsNoTracking()
            .Where(c => c.UserId == userId && moduleIds.Contains(c.ModuleId)).Select(c => c.ModuleStepId).ToListAsync(ct);
        var progressQuery = db.UserModuleProgress.Where(p => p.UserId == userId && moduleIds.Contains(p.ModuleId));
        var progress = await (track ? progressQuery : progressQuery.AsNoTracking()).ToListAsync(ct);
        return new ModuleProgressSnapshot
        {
            StepsByModule = steps.GroupBy(s => s.ModuleId).ToDictionary(g => g.Key, g => g.OrderBy(s => s.Order).ToList()),
            CompletedSteps = completed.ToHashSet(),
            ModuleProgress = progress.ToDictionary(p => p.ModuleId),
        };
    }

    public async Task<List<RoadmapLink>> LinksAsync(IReadOnlyCollection<Guid> roadmapIds, CancellationToken ct) =>
        await db.RoadmapModuleLinks.AsNoTracking().Where(l => roadmapIds.Contains(l.RoadmapId))
            .OrderBy(l => l.Order).Select(l => new RoadmapLink(l.RoadmapId, l.ModuleId, l.Order, l.IsRequired)).ToListAsync(ct);

    public async Task<Dictionary<Guid, double>> CompletionPercentAsync(Guid userId, IEnumerable<Guid> roadmapIds, CancellationToken ct)
    {
        var ids = roadmapIds.Distinct().ToList();
        if (ids.Count == 0) return [];
        var links = await LinksAsync(ids, ct);
        var snapshot = await SnapshotAsync(userId, links.Select(l => l.ModuleId).Distinct().ToList(), track: false, ct);
        return ids.ToDictionary(id => id, id => RoadmapComposition.Progress(links.Where(l => l.RoadmapId == id),
            snapshot.StepsPerModule, snapshot.CompletedStepsPerModule, snapshot.CompletedModules).Percent);
    }

    public async Task<bool> IsUnlockedAsync(Guid userId, Guid roadmapId, bool isAdmin, CancellationToken ct)
    {
        if (isAdmin) return true;
        var deps = await db.RoadmapDependencies.Where(d => d.RoadmapId == roadmapId).ToListAsync(ct);
        if (deps.Count == 0) return true;
        var pct = await CompletionPercentAsync(userId, deps.Select(d => d.RequiredRoadmapId), ct);
        return RoadmapUnlock.IsUnlocked(deps.Select(d => (d.MinimumPercent, pct.GetValueOrDefault(d.RequiredRoadmapId))));
    }

    /// <summary>
    /// Advances the learner's modules after an answer (or a roadmap start): every open module of every enrolled roadmap and
    /// every module already started is evaluated; met steps complete in order, then modules and roadmaps complete.
    /// XP is paid once per step, once per module and once per roadmap. With <paramref name="topicId"/>, only modules whose
    /// current step is in that topic are evaluated first (an answer can only change those); completions cascade from there.
    /// Uses a fixed number of queries regardless of how many roadmaps are enrolled. Caller saves.
    /// </summary>
    public async Task<List<CompletedStepDto>> AdvanceAsync(User user, Guid? topicId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var enrolled = await db.UserRoadmapProgress.Where(p => p.UserId == user.Id && p.CompletedAt == null).ToListAsync(ct);
        var links = await LinksAsync(enrolled.Select(p => p.RoadmapId).ToList(), ct);
        var startedIds = await db.UserModuleProgress.Where(p => p.UserId == user.Id).Select(p => p.ModuleId).ToListAsync(ct);
        var moduleIds = links.Select(l => l.ModuleId).Concat(startedIds).Distinct().ToList();
        if (moduleIds.Count == 0) return [];

        var snapshot = await SnapshotAsync(user.Id, moduleIds, track: true, ct);
        var modules = await db.LearningModules.AsNoTracking().Where(m => moduleIds.Contains(m.Id))
            .Select(m => new { m.Id, m.Slug, m.Name, m.XPReward, m.Version }).ToDictionaryAsync(m => m.Id, ct);
        var roadmaps = await db.Roadmaps.AsNoTracking().Where(r => enrolled.Select(p => p.RoadmapId).Contains(r.Id))
            .Select(r => new { r.Id, r.Name, r.XPReward }).ToDictionaryAsync(r => r.Id, ct);
        var tr = await localizer.LoadAsync(ct);
        List<AttemptRow>? attempts = null;
        var results = new List<CompletedStepDto>();

        UserModuleProgress Progress(Guid moduleId)
        {
            if (snapshot.ModuleProgress.TryGetValue(moduleId, out var p)) return p;
            p = new UserModuleProgress { UserId = user.Id, ModuleId = moduleId, StartedAt = now };
            db.UserModuleProgress.Add(p);
            return snapshot.ModuleProgress[moduleId] = p;
        }

        (Guid Id, string Name) RoadmapFor(Guid moduleId)
        {
            var link = links.FirstOrDefault(l => l.ModuleId == moduleId);
            return link is null ? (Guid.Empty, "") : (link.RoadmapId, tr.RoadmapName(link.RoadmapId, roadmaps[link.RoadmapId].Name));
        }

        var firstPass = true;
        bool progressed;
        do
        {
            progressed = false;
            var completedModules = snapshot.CompletedModules;
            var startedModules = snapshot.StartedModules;
            var open = enrolled.SelectMany(p => RoadmapComposition.OpenModules(links.Where(l => l.RoadmapId == p.RoadmapId), completedModules, startedModules))
                .Concat(snapshot.ModuleProgress.Keys)
                .Distinct().OrderBy(id => id).ToList();

            foreach (var moduleId in open)
            {
                var steps = snapshot.Steps(moduleId);
                var current = RoadmapComposition.CurrentStep(steps, snapshot.CompletedSteps);
                if (current is null) continue;
                if (firstPass && topicId is not null && current.TopicId != topicId) continue;

                var progress = Progress(moduleId);
                attempts ??= await LatestAttemptsAsync(user.Id, snapshot.StepsByModule.Values.SelectMany(s => s).Select(s => s.TopicId).Distinct().ToList(), ct);
                var module = modules[moduleId];
                while (current is not null && Evaluate(current, attempts).IsMet)
                {
                    db.UserModuleStepCompletions.Add(new UserModuleStepCompletion { UserId = user.Id, ModuleStepId = current.Id, ModuleId = moduleId, CompletedAt = now });
                    snapshot.CompletedSteps.Add(current.Id);
                    var earned = xp.Award(user, current.XPReward, XpReason.RoadmapStepCompleted, XpSourceType.RoadmapStep, current.Id).Amount;
                    progress.CompletedSteps = steps.Count(s => snapshot.CompletedSteps.Contains(s.Id));

                    var moduleDone = false;
                    if (progress.CompletedAt is null && progress.CompletedSteps >= steps.Count)
                    {
                        progress.CompletedAt = now;
                        progress.CompletedVersion = module.Version;
                        earned += xp.Award(user, module.XPReward, XpReason.RoadmapModuleCompleted, XpSourceType.RoadmapModule, moduleId).Amount;
                        moduleDone = true;
                    }

                    var (roadmapId, roadmapName) = RoadmapFor(moduleId);
                    results.Add(new CompletedStepDto(roadmapId, roadmapName, current.Id, tr.StepTitle(current.Id, current.Title), earned, moduleDone, false,
                        module.Slug, tr.ModuleName(moduleId, module.Name)));
                    progressed = true;
                    current = RoadmapComposition.CurrentStep(steps, snapshot.CompletedSteps);
                }
            }
            firstPass = false;
        } while (progressed);

        // Roadmaps: counters, current step and completion (roadmap XP once per roadmap).
        var finalCompleted = snapshot.CompletedModules;
        foreach (var p in enrolled)
        {
            var rLinks = links.Where(l => l.RoadmapId == p.RoadmapId).ToList();
            var (done, _, _) = RoadmapComposition.Progress(rLinks, snapshot.StepsPerModule, snapshot.CompletedStepsPerModule, finalCompleted);
            var changed = done != p.CompletedSteps;
            p.CompletedSteps = done;
            p.CurrentStepId = RoadmapComposition.OpenModules(rLinks, finalCompleted, snapshot.StartedModules)
                .Select(m => RoadmapComposition.CurrentStep(snapshot.Steps(m), snapshot.CompletedSteps)?.Id).FirstOrDefault(id => id != null);
            if (changed) p.LastActivityAt = now;
            if (rLinks.Count == 0 || !RoadmapComposition.IsCompleted(rLinks, finalCompleted)) continue;

            p.CompletedAt = now;
            p.LastActivityAt = now;
            var bonus = xp.Award(user, roadmaps[p.RoadmapId].XPReward, XpReason.RoadmapCompleted, XpSourceType.Roadmap, p.RoadmapId).Amount;
            var name = tr.RoadmapName(p.RoadmapId, roadmaps[p.RoadmapId].Name);
            var index = results.FindLastIndex(r => rLinks.Any(l => l.ModuleId == modules.Values.FirstOrDefault(m => m.Slug == r.ModuleSlug)?.Id));
            if (index >= 0)
                results[index] = results[index] with { RoadmapId = p.RoadmapId, RoadmapName = name, RoadmapCompleted = true, XpEarned = results[index].XpEarned + bonus };
            else
                results.Add(new CompletedStepDto(p.RoadmapId, name, Guid.Empty, "", bonus, false, true, "", ""));
        }
        return results;
    }
}
