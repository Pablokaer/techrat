using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Domain.Common;
using TechRat.Domain.Roadmaps;

namespace TechRat.Application.Roadmaps;

public sealed record RoadmapSummaryDto(
    Guid Id, string Slug, string Name, string Description, string Category, string Difficulty, int EstimatedHours,
    int StepsCount, int ModulesCount, string Icon, int XpReward, IReadOnlyList<string> Prerequisites,
    RoadmapUserStateDto? Progress);

public sealed record RoadmapUserStateDto(bool IsUnlocked, bool IsStarted, bool IsCompleted, int CompletedSteps, double PercentComplete, DateTimeOffset? LastActivityAt);

public sealed record RoadmapPrerequisiteDto(string Slug, string Name, int MinimumPercent, double CurrentPercent, bool IsMet);

public sealed record RoadmapStepDto(
    Guid Id, string Title, string Description, int Order, string Difficulty, int EstimatedMinutes,
    string TopicSlug, string TopicName, string? SubtopicSlug, string? SubtopicName,
    int MinimumQuestions, int MinimumAccuracy, int XpReward, string Status, StepCriteriaResult? Criteria);

public sealed record RoadmapModuleDto(Guid Id, string Title, int Order, int XpReward, bool IsCompleted, IReadOnlyList<RoadmapStepDto> Steps);

public sealed record RoadmapDetailDto(
    RoadmapSummaryDto Summary, IReadOnlyList<RoadmapPrerequisiteDto> Prerequisites, IReadOnlyList<RoadmapModuleDto> Modules, Guid? CurrentStepId);

public static class StepStatus
{
    public const string Completed = "Completed";
    public const string Current = "Current";
    public const string Locked = "Locked";
}

public sealed class RoadmapService(IAppDbContext db, RoadmapProgressService progress, ICacheService cache, ContentLocalizer localizer, TimeProvider clock)
{
    private sealed record CatalogRow(Guid Id, string Slug, string Name, string Description, string Category, RoadmapDifficulty Difficulty,
        int EstimatedHours, int StepsCount, int ModulesCount, string Icon, int XpReward, int DisplayOrder, List<string> Prerequisites);

    private Task<List<CatalogRow>> CatalogAsync(CancellationToken ct) =>
        cache.GetOrCreateAsync(CacheKeys.Roadmaps, TimeSpan.FromMinutes(10), async c =>
            await db.Roadmaps.AsNoTracking().Where(r => r.IsPublished).OrderBy(r => r.DisplayOrder)
                .Select(r => new CatalogRow(r.Id, r.Slug, r.Name, r.Description, r.Category, r.Difficulty, r.EstimatedHours,
                    r.StepsCount, r.Modules.Count, r.Icon, r.XPReward, r.DisplayOrder,
                    r.Dependencies.Select(d => d.RequiredRoadmap!.Slug).ToList()))
                .ToListAsync(c), ct);

    public async Task<IReadOnlyList<RoadmapSummaryDto>> ListAsync(Guid? userId, string? category, CancellationToken ct)
    {
        var rows = await CatalogAsync(ct);
        var tr = await localizer.LoadAsync(ct);
        // Accept the category in English or in the request language.
        if (!string.IsNullOrWhiteSpace(category))
            rows = rows.Where(r => string.Equals(r.Category, category, StringComparison.OrdinalIgnoreCase)
                || string.Equals(tr.RoadmapCategory(r.Id, r.Category), category, StringComparison.OrdinalIgnoreCase)).ToList();

        Dictionary<Guid, RoadmapUserStateDto> states = [];
        if (userId is { } uid) states = await UserStatesAsync(uid, rows.Select(r => r.Id).ToList(), ct);
        return rows.Select(r => ToSummary(r, states.GetValueOrDefault(r.Id), tr)).ToList();
    }

    private static RoadmapSummaryDto ToSummary(CatalogRow r, RoadmapUserStateDto? state, ContentTranslations tr) =>
        new(r.Id, r.Slug, tr.RoadmapName(r.Id, r.Name), tr.RoadmapDescription(r.Id, r.Description), tr.RoadmapCategory(r.Id, r.Category),
            r.Difficulty.ToString(), r.EstimatedHours, r.StepsCount, r.ModulesCount, r.Icon, r.XpReward, r.Prerequisites, state);

    private async Task<Dictionary<Guid, RoadmapUserStateDto>> UserStatesAsync(Guid userId, List<Guid> ids, CancellationToken ct)
    {
        var started = await db.UserRoadmapProgress.AsNoTracking().Where(p => p.UserId == userId).ToListAsync(ct);
        var percents = await progress.CompletionPercentAsync(userId, ids, ct);
        var deps = await db.RoadmapDependencies.AsNoTracking().Where(d => ids.Contains(d.RoadmapId)).ToListAsync(ct);
        var depPercents = await progress.CompletionPercentAsync(userId, deps.Select(d => d.RequiredRoadmapId), ct);

        return ids.ToDictionary(id => id, id =>
        {
            var p = started.FirstOrDefault(x => x.RoadmapId == id);
            var unlocked = RoadmapUnlock.IsUnlocked(deps.Where(d => d.RoadmapId == id)
                .Select(d => (d.MinimumPercent, depPercents.GetValueOrDefault(d.RequiredRoadmapId))));
            return new RoadmapUserStateDto(unlocked, p is not null, p?.CompletedAt is not null,
                p?.CompletedSteps ?? 0, percents.GetValueOrDefault(id), p?.LastActivityAt);
        });
    }

    public async Task<RoadmapDetailDto> GetAsync(string slug, Guid? userId, CancellationToken ct)
    {
        var roadmap = await db.Roadmaps.AsNoTracking().FirstOrDefaultAsync(r => r.Slug == slug && r.IsPublished, ct)
            ?? throw new NotFoundException("Roadmap", slug);
        var catalog = (await CatalogAsync(ct)).First(r => r.Id == roadmap.Id);
        var tr = await localizer.LoadAsync(ct);

        var modules = await db.RoadmapModules.AsNoTracking().Where(m => m.RoadmapId == roadmap.Id).OrderBy(m => m.Order).ToListAsync(ct);
        var steps = await (from s in db.RoadmapSteps.AsNoTracking()
                           where s.RoadmapId == roadmap.Id
                           join t in db.Topics on s.TopicId equals t.Id
                           join st in db.Subtopics on s.SubtopicId equals st.Id into sts
                           from st in sts.DefaultIfEmpty()
                           orderby s.Order
                           select new { Step = s, TopicSlug = t.Slug, TopicName = t.Name, SubSlug = st != null ? st.Slug : null, SubName = st != null ? st.Name : null })
                          .ToListAsync(ct);

        var deps = await db.RoadmapDependencies.AsNoTracking().Where(d => d.RoadmapId == roadmap.Id)
            .Select(d => new { d.RequiredRoadmapId, d.MinimumPercent, d.RequiredRoadmap!.Slug, d.RequiredRoadmap.Name }).ToListAsync(ct);

        HashSet<Guid> completed = [];
        UserRoadmapProgress? userProgress = null;
        Dictionary<Guid, double> depPercents = [];
        RoadmapUserStateDto? state = null;
        if (userId is { } uid)
        {
            completed = (await db.UserRoadmapStepCompletions.Where(c => c.UserId == uid && c.RoadmapId == roadmap.Id)
                .Select(c => c.RoadmapStepId).ToListAsync(ct)).ToHashSet();
            userProgress = await db.UserRoadmapProgress.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == uid && p.RoadmapId == roadmap.Id, ct);
            depPercents = await progress.CompletionPercentAsync(uid, deps.Select(d => d.RequiredRoadmapId), ct);
            state = (await UserStatesAsync(uid, [roadmap.Id], ct))[roadmap.Id];
        }

        var currentStep = steps.FirstOrDefault(s => !completed.Contains(s.Step.Id))?.Step;
        StepCriteriaResult? currentCriteria = null;
        if (userId is { } u2 && currentStep is not null)
            currentCriteria = await progress.EvaluateStepAsync(u2, currentStep, ct);

        var moduleDtos = modules.Select(m =>
        {
            var ms = steps.Where(s => s.Step.ModuleId == m.Id).Select(s =>
            {
                var status = completed.Contains(s.Step.Id) ? StepStatus.Completed
                    : s.Step.Id == currentStep?.Id ? StepStatus.Current : StepStatus.Locked;
                return new RoadmapStepDto(s.Step.Id, tr.StepTitle(s.Step.Id, s.Step.Title), tr.StepDescription(s.Step.Id, s.Step.Description),
                    s.Step.Order, s.Step.Difficulty.ToString(), s.Step.EstimatedMinutes, s.TopicSlug, tr.TopicName(s.Step.TopicId, s.TopicName),
                    s.SubSlug, s.Step.SubtopicId is { } sid && s.SubName is not null ? tr.SubtopicName(sid, s.SubName) : s.SubName,
                    s.Step.MinimumQuestions, s.Step.MinimumAccuracy, s.Step.XPReward, status, status == StepStatus.Current ? currentCriteria : null);
            }).ToList();
            return new RoadmapModuleDto(m.Id, tr.ModuleTitle(m.Id, m.Title), m.Order, m.XPReward, ms.Count > 0 && ms.All(s => s.Status == StepStatus.Completed), ms);
        }).ToList();

        var prereqs = deps.Select(d =>
        {
            var pct = depPercents.GetValueOrDefault(d.RequiredRoadmapId);
            return new RoadmapPrerequisiteDto(d.Slug, tr.RoadmapName(d.RequiredRoadmapId, d.Name), d.MinimumPercent, pct, pct >= d.MinimumPercent);
        }).ToList();

        return new RoadmapDetailDto(ToSummary(catalog, state, tr), prereqs, moduleDtos, userProgress is null ? null : currentStep?.Id);
    }

    /// <summary>Enrols the user. Previously demonstrated knowledge counts: satisfied steps complete right away.</summary>
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
            var firstStep = await db.RoadmapSteps.Where(s => s.RoadmapId == roadmap.Id).OrderBy(s => s.Order).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);
            db.UserRoadmapProgress.Add(new UserRoadmapProgress
            { UserId = userId, RoadmapId = roadmap.Id, StartedAt = now, LastActivityAt = now, CurrentStepId = firstStep });
            await db.SaveChangesAsync(ct);

            var user = await db.UserProfiles.FirstAsync(u => u.Id == userId, ct);
            var done = await progress.AdvanceAsync(user, null, ct);
            if (done.Count > 0) db.Enqueue(OutboxEvents.UserProgressChanged, new UserProgressChanged(userId, null, "roadmap"), clock.GetUtcNow());
            await db.SaveChangesAsync(ct);
        }
        return await GetAsync(slug, userId, ct);
    }
}
