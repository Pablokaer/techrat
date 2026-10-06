using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Domain.Common;
using TechRat.Domain.Roadmaps;

namespace TechRat.Application.Roadmaps;

/// <param name="JuniorRank">
/// Position among the platform's top roadmaps for junior developers (1 = most recommended), or null when the roadmap is
/// not one of them. Clients use it for the "Recommended for juniors" filter.
/// </param>
public sealed record RoadmapSummaryDto(
    Guid Id, string Slug, string Name, string Description, string Category, string Difficulty, int EstimatedHours,
    int StepsCount, int ModulesCount, string Icon, int XpReward, IReadOnlyList<string> Prerequisites,
    RoadmapUserStateDto? Progress, int? JuniorRank);

/// <summary>
/// The learner's state in a roadmap. <see cref="AlreadyCompletedModules"/>/<see cref="AlreadyCompletedSteps"/> count work done
/// anywhere (shared modules), so a roadmap the learner never opened can already be partly complete.
/// </summary>
public sealed record RoadmapUserStateDto(
    bool IsUnlocked, bool IsStarted, bool IsCompleted, int CompletedSteps, double PercentComplete, DateTimeOffset? LastActivityAt,
    int AlreadyCompletedModules, int AlreadyCompletedSteps);

public sealed record RoadmapPrerequisiteDto(string Slug, string Name, int MinimumPercent, double CurrentPercent, bool IsMet);

public sealed record RoadmapStepDto(
    Guid Id, string Title, string Description, int Order, string Difficulty, int EstimatedMinutes,
    string TopicSlug, string TopicName, string? SubtopicSlug, string? SubtopicName,
    int MinimumQuestions, int MinimumAccuracy, int XpReward, string Status, StepCriteriaResult? Criteria, bool IsNew);

public sealed record RoadmapRefDto(string Slug, string Name);

public sealed record RoadmapModuleDto(
    Guid Id, string Title, int Order, int XpReward, bool IsCompleted, IReadOnlyList<RoadmapStepDto> Steps,
    string ModuleSlug, string Kind, bool IsRequired, string Description, IReadOnlyList<RoadmapRefDto> UsedInRoadmaps,
    bool CompletedElsewhere, int Version, string Status);

public sealed record RoadmapDetailDto(
    RoadmapSummaryDto Summary, IReadOnlyList<RoadmapPrerequisiteDto> Prerequisites, IReadOnlyList<RoadmapModuleDto> Modules, Guid? CurrentStepId);

public static class StepStatus
{
    public const string Completed = "Completed";
    public const string Current = "Current";
    public const string Locked = "Locked";
}

public static class ModuleStatus
{
    public const string Completed = "Completed";
    public const string Current = "Current";
    public const string Locked = "Locked";
}

public sealed class RoadmapService(IAppDbContext db, RoadmapProgressService progress, ICacheService cache, ContentLocalizer localizer, TimeProvider clock)
{
    private sealed record LinkRow(Guid ModuleId, int Order, bool IsRequired);
    private sealed record CatalogRow(Guid Id, string Slug, string Name, string Description, string Category, RoadmapDifficulty Difficulty,
        int EstimatedHours, int StepsCount, string Icon, int XpReward, int DisplayOrder, int? JuniorRank, List<string> Prerequisites, List<LinkRow> Links);

    private Task<List<CatalogRow>> CatalogAsync(CancellationToken ct) =>
        cache.GetOrCreateAsync(CacheKeys.Roadmaps, TimeSpan.FromMinutes(10), async c =>
            await db.Roadmaps.AsNoTracking().Where(r => r.IsPublished).OrderBy(r => r.DisplayOrder)
                .Select(r => new CatalogRow(r.Id, r.Slug, r.Name, r.Description, r.Category, r.Difficulty, r.EstimatedHours,
                    r.StepsCount, r.Icon, r.XPReward, r.DisplayOrder, r.JuniorRank,
                    r.Dependencies.Select(d => d.RequiredRoadmap!.Slug).ToList(),
                    r.Links.OrderBy(l => l.Order).Select(l => new LinkRow(l.ModuleId, l.Order, l.IsRequired)).ToList()))
                .ToListAsync(c), ct);

    private static List<RoadmapLink> Links(CatalogRow r) => r.Links.Select(l => new RoadmapLink(r.Id, l.ModuleId, l.Order, l.IsRequired)).ToList();

    public async Task<IReadOnlyList<RoadmapSummaryDto>> ListAsync(Guid? userId, string? category, CancellationToken ct)
    {
        var rows = await CatalogAsync(ct);
        var tr = await localizer.LoadAsync(ct);
        // Accept the category in English or in the request language.
        if (!string.IsNullOrWhiteSpace(category))
            rows = rows.Where(r => string.Equals(r.Category, category, StringComparison.OrdinalIgnoreCase)
                || string.Equals(tr.RoadmapCategory(r.Id, r.Category), category, StringComparison.OrdinalIgnoreCase)).ToList();

        Dictionary<Guid, RoadmapUserStateDto> states = [];
        if (userId is { } uid) states = await UserStatesAsync(uid, rows, ct);
        return rows.Select(r => ToSummary(r, states.GetValueOrDefault(r.Id), tr)).ToList();
    }

    private static RoadmapSummaryDto ToSummary(CatalogRow r, RoadmapUserStateDto? state, ContentTranslations tr) =>
        new(r.Id, r.Slug, tr.RoadmapName(r.Id, r.Name), tr.RoadmapDescription(r.Id, r.Description), tr.RoadmapCategory(r.Id, r.Category),
            r.Difficulty.ToString(), r.EstimatedHours, r.StepsCount, r.Links.Count, r.Icon, r.XpReward, r.Prerequisites, state, r.JuniorRank);

    private async Task<Dictionary<Guid, RoadmapUserStateDto>> UserStatesAsync(Guid userId, List<CatalogRow> rows, CancellationToken ct)
    {
        var started = await db.UserRoadmapProgress.AsNoTracking().Where(p => p.UserId == userId).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var deps = await db.RoadmapDependencies.AsNoTracking().Where(d => ids.Contains(d.RoadmapId)).ToListAsync(ct);

        // One snapshot for every module of the listed roadmaps and of their prerequisites.
        var depIds = deps.Select(d => d.RequiredRoadmapId).Distinct().ToList();
        var allRows = (await CatalogAsync(ct)).Where(r => ids.Contains(r.Id) || depIds.Contains(r.Id)).ToList();
        var links = allRows.SelectMany(Links).ToList();
        var snapshot = await progress.SnapshotAsync(userId, links.Select(l => l.ModuleId).Distinct().ToList(), track: false, ct);
        var completedModules = snapshot.CompletedModules;
        double Percent(Guid roadmapId) => RoadmapComposition.Progress(links.Where(l => l.RoadmapId == roadmapId),
            snapshot.StepsPerModule, snapshot.CompletedStepsPerModule, completedModules).Percent;

        return rows.ToDictionary(r => r.Id, r =>
        {
            var p = started.FirstOrDefault(x => x.RoadmapId == r.Id);
            var rLinks = Links(r);
            var (done, _, pct) = RoadmapComposition.Progress(rLinks, snapshot.StepsPerModule, snapshot.CompletedStepsPerModule, completedModules);
            var unlocked = RoadmapUnlock.IsUnlocked(deps.Where(d => d.RoadmapId == r.Id).Select(d => (d.MinimumPercent, Percent(d.RequiredRoadmapId))));
            return new RoadmapUserStateDto(unlocked, p is not null, p?.CompletedAt is not null, done, pct, p?.LastActivityAt,
                rLinks.Count(l => completedModules.Contains(l.ModuleId)), done);
        });
    }

    public async Task<RoadmapDetailDto> GetAsync(string slug, Guid? userId, CancellationToken ct)
    {
        var catalog = (await CatalogAsync(ct)).FirstOrDefault(r => r.Slug == slug) ?? throw new NotFoundException("Roadmap", slug);
        var tr = await localizer.LoadAsync(ct);
        var links = Links(catalog);
        var moduleIds = links.Select(l => l.ModuleId).ToList();

        var modules = await db.LearningModules.AsNoTracking().Where(m => moduleIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, ct);
        var steps = await (from s in db.ModuleSteps.AsNoTracking()
                           where moduleIds.Contains(s.ModuleId) && s.IsActive
                           join t in db.Topics on s.TopicId equals t.Id
                           join st in db.Subtopics on s.SubtopicId equals st.Id into sts
                           from st in sts.DefaultIfEmpty()
                           select new { Step = s, TopicSlug = t.Slug, TopicName = t.Name, SubSlug = st != null ? st.Slug : null, SubName = st != null ? st.Name : null })
                          .ToListAsync(ct);
        // "Also in": other published roadmaps containing each module.
        var usedIn = await (from l in db.RoadmapModuleLinks.AsNoTracking()
                            where moduleIds.Contains(l.ModuleId) && l.RoadmapId != catalog.Id
                            join r in db.Roadmaps on l.RoadmapId equals r.Id
                            where r.IsPublished
                            orderby r.DisplayOrder
                            select new { l.ModuleId, r.Id, r.Slug, r.Name }).ToListAsync(ct);

        var deps = await db.RoadmapDependencies.AsNoTracking().Where(d => d.RoadmapId == catalog.Id)
            .Select(d => new { d.RequiredRoadmapId, d.MinimumPercent, d.RequiredRoadmap!.Slug, d.RequiredRoadmap.Name }).ToListAsync(ct);

        var snapshot = new ModuleProgressSnapshot { StepsByModule = [], CompletedSteps = [], ModuleProgress = [] };
        UserRoadmapProgress? userProgress = null;
        Dictionary<Guid, double> depPercents = [];
        RoadmapUserStateDto? state = null;
        if (userId is { } uid)
        {
            snapshot = await progress.SnapshotAsync(uid, moduleIds, track: false, ct);
            userProgress = await db.UserRoadmapProgress.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == uid && p.RoadmapId == catalog.Id, ct);
            depPercents = await progress.CompletionPercentAsync(uid, deps.Select(d => d.RequiredRoadmapId), ct);
            state = (await UserStatesAsync(uid, [catalog], ct))[catalog.Id];
        }

        var completedModules = snapshot.CompletedModules;
        var open = RoadmapComposition.OpenModules(links, completedModules, snapshot.StartedModules).ToHashSet();
        var currentSteps = open.Select(m => RoadmapComposition.CurrentStep(steps.Where(s => s.Step.ModuleId == m).Select(s => s.Step), snapshot.CompletedSteps))
            .Where(s => s is not null).Select(s => s!).ToList();
        var criteria = userId is { } u2 ? await progress.EvaluateStepsAsync(u2, currentSteps, ct) : [];
        var currentIds = currentSteps.Select(s => s.Id).ToHashSet();

        var moduleDtos = links.Select(link =>
        {
            var m = modules[link.ModuleId];
            snapshot.ModuleProgress.TryGetValue(m.Id, out var mp);
            var isCompleted = mp?.CompletedAt is not null;
            var stepDtos = steps.Where(s => s.Step.ModuleId == m.Id).OrderBy(s => s.Step.Order).Select(s =>
            {
                var status = snapshot.CompletedSteps.Contains(s.Step.Id) ? StepStatus.Completed
                    : currentIds.Contains(s.Step.Id) ? StepStatus.Current : StepStatus.Locked;
                var isNew = isCompleted && mp!.CompletedVersion is { } v && s.Step.AddedInVersion > v;
                return new RoadmapStepDto(s.Step.Id, tr.StepTitle(s.Step.Id, s.Step.Title), tr.StepDescription(s.Step.Id, s.Step.Description),
                    s.Step.Order, s.Step.Difficulty.ToString(), s.Step.EstimatedMinutes, s.TopicSlug, tr.TopicName(s.Step.TopicId, s.TopicName),
                    s.SubSlug, s.Step.SubtopicId is { } sid && s.SubName is not null ? tr.SubtopicName(sid, s.SubName) : s.SubName,
                    s.Step.MinimumQuestions, s.Step.MinimumAccuracy, s.Step.XPReward, status, criteria.GetValueOrDefault(s.Step.Id), isNew);
            }).ToList();
            // Credited from another roadmap: completed before this roadmap was started (or without starting it).
            var elsewhere = isCompleted && (userProgress is null || mp!.CompletedAt < userProgress.StartedAt);
            var moduleStatus = isCompleted ? ModuleStatus.Completed : open.Contains(m.Id) ? ModuleStatus.Current : ModuleStatus.Locked;
            return new RoadmapModuleDto(m.Id, tr.ModuleName(m.Id, m.Name), link.Order, m.XPReward, isCompleted, stepDtos,
                m.Slug, m.Kind.ToString(), link.IsRequired, tr.ModuleDescription(m.Id, m.Description),
                usedIn.Where(x => x.ModuleId == m.Id).Select(x => new RoadmapRefDto(x.Slug, tr.RoadmapName(x.Id, x.Name))).ToList(),
                elsewhere, m.Version, moduleStatus);
        }).ToList();

        var prereqs = deps.Select(d =>
        {
            var pct = depPercents.GetValueOrDefault(d.RequiredRoadmapId);
            return new RoadmapPrerequisiteDto(d.Slug, tr.RoadmapName(d.RequiredRoadmapId, d.Name), d.MinimumPercent, pct, pct >= d.MinimumPercent);
        }).ToList();

        return new RoadmapDetailDto(ToSummary(catalog, state, tr), prereqs, moduleDtos, userProgress is null ? null : userProgress.CurrentStepId);
    }

    /// <summary>Enrols the user. Shared modules already done elsewhere count immediately (and satisfied steps complete).</summary>
    public async Task<RoadmapDetailDto> StartAsync(Guid userId, string slug, CancellationToken ct)
    {
        var roadmap = await db.Roadmaps.FirstOrDefaultAsync(r => r.Slug == slug && r.IsPublished, ct)
            ?? throw new NotFoundException("Roadmap", slug);
        if (!await progress.IsUnlockedAsync(userId, roadmap.Id, ct))
            throw new ForbiddenException(Text.Get(Text.Keys.RoadmapLocked));

        var existing = await db.UserRoadmapProgress.FirstOrDefaultAsync(p => p.UserId == userId && p.RoadmapId == roadmap.Id, ct);
        if (existing is null)
        {
            var now = clock.GetUtcNow();
            db.UserRoadmapProgress.Add(new UserRoadmapProgress { UserId = userId, RoadmapId = roadmap.Id, StartedAt = now, LastActivityAt = now });
            await db.SaveChangesAsync(ct);

            var user = await db.UserProfiles.FirstAsync(u => u.Id == userId, ct);
            var done = await progress.AdvanceAsync(user, null, ct);
            if (done.Count > 0) db.Enqueue(OutboxEvents.UserProgressChanged, new UserProgressChanged(userId, null, "roadmap"), clock.GetUtcNow());
            await db.SaveChangesAsync(ct);
        }
        return await GetAsync(slug, userId, ct);
    }
}
