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
public sealed class ModuleService(IAppDbContext db, RoadmapProgressService progress, LearnerSteps learnerSteps, ContentLocalizer localizer)
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

        // Steps (status, new content, criteria, texts) come from the same place as the roadmap page, so both always agree.
        var steps = (await learnerSteps.ForModuleAsync(module.Id, userId, isAdmin, ct)).Steps(module.Id);

        var requiredIds = module.Dependencies.Select(d => d.RequiredModuleId).ToList();
        var requires = await db.LearningModules.AsNoTracking().Where(m => requiredIds.Contains(m.Id))
            .Select(m => new { m.Id, m.Slug, m.Name }).ToListAsync(ct);
        return new ModuleDetailDto(summary, steps, requires.Select(r => new ModuleRefDto(r.Slug, tr.ModuleName(r.Id, r.Name))).ToList());
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
