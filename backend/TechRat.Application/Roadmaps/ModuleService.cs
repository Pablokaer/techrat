using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Domain.Roadmaps;

namespace TechRat.Application.Roadmaps;

public sealed record ModuleUserStateDto(bool IsStarted, bool IsCompleted, int CompletedSteps, int? CompletedVersion);

public sealed record ModuleSummaryDto(
    Guid Id, string Slug, string Name, string Description, string Kind, string Category, string Level, string Icon,
    int StepsCount, int EstimatedMinutes, int XpReward, int Version, IReadOnlyList<RoadmapRefDto> UsedInRoadmaps, ModuleUserStateDto? Progress);

public sealed record ModuleRefDto(string Slug, string Name);

public sealed record ModuleDetailDto(ModuleSummaryDto Summary, IReadOnlyList<RoadmapStepDto> Steps, IReadOnlyList<ModuleRefDto> Requires);

/// <summary>Read side of the module catalog (published modules only).</summary>
public sealed class ModuleService(IAppDbContext db, RoadmapProgressService progress, ContentLocalizer localizer)
{
    public async Task<IReadOnlyList<ModuleSummaryDto>> ListAsync(Guid? userId, ModuleKind? kind, string? category, CancellationToken ct)
    {
        var q = db.LearningModules.AsNoTracking().Where(m => m.IsPublished);
        if (kind is not null) q = q.Where(m => m.Kind == kind);
        var modules = await q.OrderBy(m => m.DisplayOrder).ThenBy(m => m.Slug).ToListAsync(ct);
        var tr = await localizer.LoadAsync(ct);
        if (!string.IsNullOrWhiteSpace(category))
            modules = modules.Where(m => string.Equals(m.Category, category, StringComparison.OrdinalIgnoreCase)).ToList();
        return await SummariesAsync(modules, userId, tr, ct);
    }

    public async Task<ModuleDetailDto> GetAsync(string slug, Guid? userId, bool isAdmin, CancellationToken ct)
    {
        var module = await db.LearningModules.AsNoTracking().Include(m => m.Dependencies)
            .FirstOrDefaultAsync(m => m.Slug == slug && m.IsPublished, ct) ?? throw new NotFoundException("Module", slug);
        var tr = await localizer.LoadAsync(ct);
        var summary = (await SummariesAsync([module], userId, tr, ct))[0];

        var steps = await (from s in db.ModuleSteps.AsNoTracking()
                           where s.ModuleId == module.Id && s.IsActive
                           join t in db.Topics on s.TopicId equals t.Id
                           join st in db.Subtopics on s.SubtopicId equals st.Id into sts
                           from st in sts.DefaultIfEmpty()
                           orderby s.Order
                           select new { Step = s, TopicSlug = t.Slug, TopicName = t.Name, SubSlug = st != null ? st.Slug : null, SubName = st != null ? st.Name : null })
                          .ToListAsync(ct);

        var snapshot = userId is { } uid
            ? await progress.SnapshotAsync(uid, [module.Id], track: false, ct)
            : new ModuleProgressSnapshot { StepsByModule = [], CompletedSteps = [], ModuleProgress = [] };
        var current = RoadmapComposition.CurrentStep(steps.Select(s => s.Step), snapshot.CompletedSteps);
        // Administrators review everything, so every uncompleted step is open (not just the next one).
        var openSteps = isAdmin ? steps.Select(s => s.Step).Where(s => !snapshot.CompletedSteps.Contains(s.Id)).ToList()
            : current is null ? [] : [current];
        var criteria = userId is { } u2 && openSteps.Count > 0 ? await progress.EvaluateStepsAsync(u2, openSteps, ct) : [];
        snapshot.ModuleProgress.TryGetValue(module.Id, out var mp);

        var stepDtos = steps.Select(s =>
        {
            var status = snapshot.CompletedSteps.Contains(s.Step.Id) ? StepStatus.Completed
                : isAdmin || s.Step.Id == current?.Id ? StepStatus.Current : StepStatus.Locked;
            var isNew = mp?.CompletedVersion is { } v && s.Step.AddedInVersion > v;
            return new RoadmapStepDto(s.Step.Id, tr.StepTitle(s.Step.Id, s.Step.Title), tr.StepDescription(s.Step.Id, s.Step.Description),
                s.Step.Order, s.Step.Difficulty.ToString(), s.Step.EstimatedMinutes, s.TopicSlug, tr.TopicName(s.Step.TopicId, s.TopicName),
                s.SubSlug, s.Step.SubtopicId is { } sid && s.SubName is not null ? tr.SubtopicName(sid, s.SubName) : s.SubName,
                s.Step.MinimumQuestions, s.Step.MinimumAccuracy, s.Step.XPReward, status, criteria.GetValueOrDefault(s.Step.Id), isNew);
        }).ToList();

        var requiredIds = module.Dependencies.Select(d => d.RequiredModuleId).ToList();
        var requires = await db.LearningModules.AsNoTracking().Where(m => requiredIds.Contains(m.Id))
            .Select(m => new { m.Id, m.Slug, m.Name }).ToListAsync(ct);
        return new ModuleDetailDto(summary, stepDtos, requires.Select(r => new ModuleRefDto(r.Slug, tr.ModuleName(r.Id, r.Name))).ToList());
    }

    private async Task<List<ModuleSummaryDto>> SummariesAsync(List<LearningModule> modules, Guid? userId, ContentTranslations tr, CancellationToken ct)
    {
        var ids = modules.Select(m => m.Id).ToList();
        var stepCounts = await db.ModuleSteps.AsNoTracking().Where(s => ids.Contains(s.ModuleId) && s.IsActive)
            .GroupBy(s => s.ModuleId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var usedIn = await (from l in db.RoadmapModuleLinks.AsNoTracking()
                            where ids.Contains(l.ModuleId)
                            join r in db.Roadmaps on l.RoadmapId equals r.Id
                            where r.IsPublished
                            orderby r.DisplayOrder
                            select new { l.ModuleId, r.Id, r.Slug, r.Name }).ToListAsync(ct);
        var snapshot = userId is { } uid ? await progress.SnapshotAsync(uid, ids, track: false, ct) : null;

        return modules.Select(m =>
        {
            ModuleUserStateDto? state = null;
            if (snapshot is not null)
            {
                snapshot.ModuleProgress.TryGetValue(m.Id, out var mp);
                state = new ModuleUserStateDto(mp is not null, mp?.CompletedAt is not null,
                    snapshot.Steps(m.Id).Count(s => snapshot.CompletedSteps.Contains(s.Id)), mp?.CompletedVersion);
            }
            return new ModuleSummaryDto(m.Id, m.Slug, tr.ModuleName(m.Id, m.Name), tr.ModuleDescription(m.Id, m.Description), m.Kind.ToString(),
                m.Category, m.Level.ToString(), m.Icon, stepCounts.GetValueOrDefault(m.Id), m.EstimatedMinutes, m.XPReward, m.Version,
                usedIn.Where(x => x.ModuleId == m.Id).Select(x => new RoadmapRefDto(x.Slug, tr.RoadmapName(x.Id, x.Name))).ToList(), state);
        }).ToList();
    }
}
