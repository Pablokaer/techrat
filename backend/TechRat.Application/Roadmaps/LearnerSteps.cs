using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Domain.Roadmaps;

namespace TechRat.Application.Roadmaps;

/// <summary>
/// The three states a learner sees on a step, and on a module (a module uses the same states, so there is one set).
/// </summary>
public static class StepStatus
{
    public const string Completed = "Completed";
    public const string Current = "Current";
    public const string Locked = "Locked";
}

/// <summary>
/// Pure rules for showing a learner's steps (ADR-0012), shared by the roadmap page and the module page through
/// <see cref="LearnerSteps"/>. Kept free of I/O so they are unit-tested directly.
/// </summary>
public static class LearnerStepRules
{
    /// <summary>
    /// Modules of a roadmap whose next step the learner can work on: the open modules (<see cref="RoadmapComposition.OpenModules"/>)
    /// plus every module of the roadmap the learner already started. Started modules matter for completed modules that gained
    /// steps later: they are no longer "open", but <see cref="RoadmapProgressService.AdvanceAsync"/> still evaluates them, so
    /// their new step is workable and must not look locked.
    /// </summary>
    public static IReadOnlySet<Guid> WorkableModules(IEnumerable<RoadmapLink> links, IReadOnlySet<Guid> completedModules, IReadOnlySet<Guid> startedModules)
    {
        var list = links.ToList();
        var workable = RoadmapComposition.OpenModules(list, completedModules, startedModules).ToHashSet();
        workable.UnionWith(list.Select(l => l.ModuleId).Where(startedModules.Contains));
        return workable;
    }

    /// <summary>
    /// Steps shown as current: the next uncompleted step of each workable module (steps unlock in order). Administrators review
    /// everything, so for them every uncompleted step is open, whatever came before it.
    /// </summary>
    public static IReadOnlySet<Guid> OpenSteps(IEnumerable<ModuleStep> steps, IReadOnlySet<Guid> workableModules, IReadOnlySet<Guid> completedSteps, bool isAdmin)
    {
        var list = steps.ToList();
        if (isAdmin) return list.Where(s => !completedSteps.Contains(s.Id)).Select(s => s.Id).ToHashSet();
        return list.Where(s => workableModules.Contains(s.ModuleId)).GroupBy(s => s.ModuleId)
            .Select(g => RoadmapComposition.CurrentStep(g, completedSteps)?.Id).OfType<Guid>().ToHashSet();
    }

    /// <summary>Completion is permanent, so a completed step stays completed even where it would otherwise be open.</summary>
    public static string Status(Guid stepId, IReadOnlySet<Guid> completedSteps, IReadOnlySet<Guid> openSteps) =>
        completedSteps.Contains(stepId) ? StepStatus.Completed : openSteps.Contains(stepId) ? StepStatus.Current : StepStatus.Locked;

    /// <summary>
    /// "New content": the step was added in a module version later than the one the learner completed. Before completing a
    /// module nothing is new — the learner simply has not reached those steps yet.
    /// </summary>
    public static bool IsNew(ModuleStep step, UserModuleProgress? progress) =>
        progress is { CompletedAt: not null, CompletedVersion: { } version } && step.AddedInVersion > version;
}

/// <summary>A learner's ready-to-show steps over a set of modules, with the progress snapshot they were built from.</summary>
public sealed class LearnerStepView
{
    private readonly IReadOnlyDictionary<Guid, List<RoadmapStepDto>> _steps;

    internal LearnerStepView(IReadOnlyDictionary<Guid, List<RoadmapStepDto>> steps, ModuleProgressSnapshot snapshot)
    {
        _steps = steps;
        Snapshot = snapshot;
    }

    /// <summary>The learner's progress over the modules (empty for anonymous visitors); callers use it for module-level state.</summary>
    public ModuleProgressSnapshot Snapshot { get; }

    /// <summary>The module's active steps in order, translated, with status, "new content" flag and criteria of open steps.</summary>
    public IReadOnlyList<RoadmapStepDto> Steps(Guid moduleId) => _steps.GetValueOrDefault(moduleId) ?? [];
}

/// <summary>
/// Builds the steps a learner sees, for the module page and for the roadmap page alike. Both pages used to assemble steps
/// themselves and drifted apart (a completed module's new step looked locked on one page and current on the other); this is
/// now the only place that queries steps, applies the administrator rule, decides status and "new content", evaluates
/// criteria and translates step texts, so the same step always looks the same on both pages.
/// </summary>
public sealed class LearnerSteps(IAppDbContext db, RoadmapProgressService progress, ContentLocalizer localizer)
{
    /// <summary>Steps of one module on its own page: outside a roadmap, nothing but step order gates it.</summary>
    public Task<LearnerStepView> ForModuleAsync(Guid moduleId, Guid? userId, bool isAdmin, CancellationToken ct) =>
        BuildAsync([moduleId], _ => new HashSet<Guid> { moduleId }, userId, isAdmin, ct);

    /// <summary>Steps of a roadmap's modules: besides step order, the roadmap's module order gates them (ADR-0012 rule 2).</summary>
    public Task<LearnerStepView> ForRoadmapAsync(IReadOnlyList<RoadmapLink> links, Guid? userId, bool isAdmin, CancellationToken ct) =>
        BuildAsync(links.Select(l => l.ModuleId).Distinct().ToList(),
            s => LearnerStepRules.WorkableModules(links, s.CompletedModules, s.StartedModules), userId, isAdmin, ct);

    private async Task<LearnerStepView> BuildAsync(IReadOnlyCollection<Guid> moduleIds, Func<ModuleProgressSnapshot, IReadOnlySet<Guid>> workable,
        Guid? userId, bool isAdmin, CancellationToken ct)
    {
        var tr = await localizer.LoadAsync(ct);
        var rows = await (from s in db.ModuleSteps.AsNoTracking()
                          where moduleIds.Contains(s.ModuleId) && s.IsActive
                          join t in db.Topics on s.TopicId equals t.Id
                          join st in db.Subtopics on s.SubtopicId equals st.Id into sts
                          from st in sts.DefaultIfEmpty()
                          select new { Step = s, TopicSlug = t.Slug, TopicName = t.Name, SubSlug = st != null ? st.Slug : null, SubName = st != null ? st.Name : null })
                         .ToListAsync(ct);

        var snapshot = userId is { } uid
            ? await progress.SnapshotAsync(uid, moduleIds, track: false, ct)
            : new ModuleProgressSnapshot { StepsByModule = [], CompletedSteps = [], ModuleProgress = [] };
        var steps = rows.Select(r => r.Step).ToList();
        var open = LearnerStepRules.OpenSteps(steps, workable(snapshot), snapshot.CompletedSteps, isAdmin);
        var criteria = userId is { } u2 ? await progress.EvaluateStepsAsync(u2, steps.Where(s => open.Contains(s.Id)).ToList(), ct) : [];

        var byModule = rows.GroupBy(r => r.Step.ModuleId).ToDictionary(g => g.Key, g =>
        {
            snapshot.ModuleProgress.TryGetValue(g.Key, out var mp);
            return g.OrderBy(r => r.Step.Order).Select(r =>
            {
                var s = r.Step;
                return new RoadmapStepDto(s.Id, tr.StepTitle(s.Id, s.Title), tr.StepDescription(s.Id, s.Description),
                    s.Order, s.Difficulty.ToString(), s.EstimatedMinutes, r.TopicSlug, tr.TopicName(s.TopicId, r.TopicName),
                    r.SubSlug, s.SubtopicId is { } sid && r.SubName is not null ? tr.SubtopicName(sid, r.SubName) : r.SubName,
                    s.MinimumQuestions, s.MinimumAccuracy, s.XPReward, LearnerStepRules.Status(s.Id, snapshot.CompletedSteps, open),
                    criteria.GetValueOrDefault(s.Id), LearnerStepRules.IsNew(s, mp));
            }).ToList();
        });
        return new LearnerStepView(byModule, snapshot);
    }
}
