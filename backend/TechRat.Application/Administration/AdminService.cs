using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Domain.Common;
using TechRat.Domain.Content;
using TechRat.Domain.Roadmaps;

namespace TechRat.Application.Administration;

public sealed record AdminOptionInput(string Text, bool IsCorrect);

public sealed record AdminQuestionInput(
    string TopicSlug, string SubtopicSlug, Difficulty Difficulty, string Title, string QuestionText, string Explanation,
    string ReferenceUrl, int? XpReward, bool IsActive, IReadOnlyList<AdminOptionInput> Options);

public sealed record AdminQuestionDto(
    Guid Id, string? ExternalKey, string TopicSlug, string SubtopicSlug, Difficulty Difficulty, QuestionType QuestionType, string Title,
    string QuestionText, string Explanation, string ReferenceUrl, int XpReward, bool IsActive, DateTimeOffset UpdatedAt,
    IReadOnlyList<AdminOptionDto> Options);

public sealed record AdminOptionDto(Guid Id, string Text, bool IsCorrect, int DisplayOrder);

public sealed record AdminTopicInput(string Slug, string Name, string Description, string Category, string Icon, bool IsActive = true);
public sealed record AdminSubtopicInput(string Slug, string Name);

public sealed record AdminRoadmapInput(string Slug, string Name, string Description, string Category, RoadmapDifficulty Difficulty,
    int EstimatedHours, string Icon, bool IsPublished, int XpReward);

/// <summary>Adds a step to a roadmap: into an existing module of the roadmap (<see cref="ModuleId"/>) or a new Context module.</summary>
public sealed record AdminStepInput(Guid? ModuleId, string? NewModuleTitle, string Title, string Description, Difficulty Difficulty,
    int EstimatedMinutes, string TopicSlug, string? SubtopicSlug, int MinimumQuestions, int MinimumAccuracy, int XpReward, int? Order,
    bool IsActive = true);

public sealed record AdminModuleInput(string Slug, string Name, string Description, ModuleKind Kind, string Category, RoadmapDifficulty Level,
    string Icon, bool IsPublished, bool IsStandalone, int XpReward);

public sealed record AdminModuleStepDto(Guid Id, int Order, string Title, string Description, Difficulty Difficulty, int EstimatedMinutes,
    string TopicSlug, string? SubtopicSlug, int MinimumQuestions, int MinimumAccuracy, int XpReward, bool IsActive, int AddedInVersion);

public sealed record AdminModuleDto(Guid Id, string Slug, string Name, string Description, ModuleKind Kind, string Category, RoadmapDifficulty Level,
    string Icon, bool IsPublished, bool IsStandalone, int XpReward, int Version, bool SeedManaged, IReadOnlyList<string> UsedInRoadmaps,
    IReadOnlyList<AdminModuleStepDto> Steps);

public sealed record AdminRoadmapLinkInput(string ModuleSlug, bool IsRequired = true, int? Order = null);

/// <summary>Full ordered composition of a roadmap (replaces order and required flags; modules not listed are removed).</summary>
public sealed record AdminCompositionInput(IReadOnlyList<AdminRoadmapLinkInput> Modules);

public sealed record AdminRoadmapLinkDto(string ModuleSlug, string ModuleName, ModuleKind Kind, int Order, bool IsRequired, int Steps);

public sealed record AdminCompositionDto(string RoadmapSlug, bool SeedManaged, IReadOnlyList<AdminRoadmapLinkDto> Modules);

public sealed record AdminUserDto(Guid Id, string Username, string DisplayName, string Email, int Level, long Xp, int QuestionsAnswered,
    double Accuracy, DateTimeOffset CreatedAt, DateTimeOffset? LastLoginAt);

public sealed record AdminStatsDto(int Users, int Topics, int Subtopics, int Questions, int ActiveQuestions, int Roadmaps, int Steps, int Attempts, int Modules);

public sealed class AdminService(IAppDbContext db, ICacheService cache, IOptions<GamificationOptions> options, TimeProvider clock)
{
    private static readonly System.Text.RegularExpressions.Regex SlugRx = new("^[a-z0-9]+(-[a-z0-9]+)*$");

    private async Task InvalidateAsync(CancellationToken ct)
    {
        await cache.RemoveAsync(CacheKeys.Topics, ct);
        await cache.RemoveAsync(CacheKeys.Roadmaps, ct);
    }

    public async Task<AdminStatsDto> StatsAsync(CancellationToken ct) => new(
        await db.UserProfiles.CountAsync(ct), await db.Topics.CountAsync(ct), await db.Subtopics.CountAsync(ct), await db.Questions.CountAsync(ct),
        await db.Questions.CountAsync(q => q.IsActive, ct), await db.Roadmaps.CountAsync(ct), await db.ModuleSteps.CountAsync(ct),
        await db.QuestionAttempts.CountAsync(ct), await db.LearningModules.CountAsync(ct));

    // ----------------------------------------------------------- questions

    public async Task<PagedResult<AdminQuestionDto>> ListQuestionsAsync(string? topic, Difficulty? difficulty, string? search, bool? active, int? page, int? pageSize, CancellationToken ct)
    {
        var (p, size) = Paging.Normalize(page, pageSize);
        var q = db.Questions.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(topic)) q = q.Where(x => x.Topic!.Slug == topic);
        if (difficulty is not null) q = q.Where(x => x.Difficulty == difficulty);
        if (active is not null) q = q.Where(x => x.IsActive == active);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(x => x.Title.ToLower().Contains(s) || x.QuestionText.ToLower().Contains(s) || (x.ExternalKey != null && x.ExternalKey.Contains(s)));
        }
        var total = await q.CountAsync(ct);
        var items = await Project(q.OrderBy(x => x.Topic!.DisplayOrder).ThenBy(x => x.Difficulty).ThenBy(x => x.Title)
            .Skip((p - 1) * size).Take(size)).ToListAsync(ct);
        return new PagedResult<AdminQuestionDto>(items, p, size, total);
    }

    private static IQueryable<AdminQuestionDto> Project(IQueryable<Question> q) => q.Select(x => new AdminQuestionDto(
        x.Id, x.ExternalKey, x.Topic!.Slug, x.Subtopic!.Slug, x.Difficulty, x.QuestionType, x.Title, x.QuestionText, x.Explanation,
        x.ReferenceUrl, x.XPReward, x.IsActive, x.UpdatedAt,
        x.Options.OrderBy(o => o.DisplayOrder).Select(o => new AdminOptionDto(o.Id, o.Text, o.IsCorrect, o.DisplayOrder)).ToList()));

    public async Task<AdminQuestionDto> GetQuestionAsync(Guid id, CancellationToken ct) =>
        await Project(db.Questions.AsNoTracking().Where(x => x.Id == id)).FirstOrDefaultAsync(ct) ?? throw new NotFoundException("Question", id);

    private async Task<(Guid TopicId, Guid SubtopicId)> ValidateQuestionAsync(AdminQuestionInput input, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(input.Title) || input.Title.Length > 120) errors["title"] = [Text.Get(Text.Keys.AdminTitleRequiredMax)];
        if (string.IsNullOrWhiteSpace(input.QuestionText) || input.QuestionText.Length < 10) errors["questionText"] = [Text.Get(Text.Keys.AdminQuestionTextRequired)];
        if (input.Options is null || input.Options.Count != 4) errors["options"] = [Text.Get(Text.Keys.AdminFourOptions)];
        else if (input.Options.Count(o => o.IsCorrect) != 1) errors["options"] = [Text.Get(Text.Keys.AdminOneCorrect)];
        else if (input.Options.Any(o => string.IsNullOrWhiteSpace(o.Text))) errors["options"] = [Text.Get(Text.Keys.AdminOptionsNotEmpty)];
        else if (input.Options.Select(o => o.Text.Trim().ToLowerInvariant()).Distinct().Count() != 4) errors["options"] = [Text.Get(Text.Keys.AdminOptionsDistinct)];
        if (!Uri.TryCreate(input.ReferenceUrl, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps) errors["referenceUrl"] = [Text.Get(Text.Keys.AdminReferenceHttps)];
        if (input.XpReward is < 0 or > 1000) errors["xpReward"] = [Text.Get(Text.Keys.AdminXpRange, 1000)];

        var topic = await db.Topics.Include(t => t.Subtopics).FirstOrDefaultAsync(t => t.Slug == input.TopicSlug, ct);
        var sub = topic?.Subtopics.FirstOrDefault(s => s.Slug == input.SubtopicSlug);
        if (topic is null) errors["topicSlug"] = [Text.Get(Text.Keys.AdminUnknownTopic)];
        else if (sub is null) errors["subtopicSlug"] = [Text.Get(Text.Keys.AdminUnknownSubtopicForTopic)];
        if (errors.Count > 0) throw new RequestValidationException(errors);
        return (topic!.Id, sub!.Id);
    }

    public async Task<AdminQuestionDto> CreateQuestionAsync(AdminQuestionInput input, CancellationToken ct)
    {
        var (topicId, subId) = await ValidateQuestionAsync(input, ct);
        var now = clock.GetUtcNow();
        var q = new Question
        {
            TopicId = topicId, SubtopicId = subId, Difficulty = input.Difficulty, Title = input.Title.Trim(), QuestionText = input.QuestionText.Trim(),
            Explanation = input.Explanation.Trim(), ReferenceUrl = input.ReferenceUrl.Trim(), XPReward = input.XpReward ?? options.Value.XpFor(input.Difficulty),
            IsActive = input.IsActive, CreatedAt = now, UpdatedAt = now,
            Options = input.Options.Select((o, i) => new QuestionOption { Text = o.Text.Trim(), IsCorrect = o.IsCorrect, DisplayOrder = i }).ToList(),
        };
        db.Questions.Add(q);
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
        return await GetQuestionAsync(q.Id, ct);
    }

    /// <summary>Options are updated in place (by position) so historical attempts keep pointing at valid options.</summary>
    public async Task<AdminQuestionDto> UpdateQuestionAsync(Guid id, AdminQuestionInput input, CancellationToken ct)
    {
        var q = await db.Questions.Include(x => x.Options).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Question", id);
        var (topicId, subId) = await ValidateQuestionAsync(input, ct);
        q.TopicId = topicId; q.SubtopicId = subId; q.Difficulty = input.Difficulty; q.Title = input.Title.Trim();
        q.QuestionText = input.QuestionText.Trim(); q.Explanation = input.Explanation.Trim(); q.ReferenceUrl = input.ReferenceUrl.Trim();
        q.XPReward = input.XpReward ?? q.XPReward; q.IsActive = input.IsActive; q.UpdatedAt = clock.GetUtcNow();
        var ordered = q.Options.OrderBy(o => o.DisplayOrder).ToList();
        for (var i = 0; i < 4; i++)
        {
            if (i < ordered.Count) { ordered[i].Text = input.Options[i].Text.Trim(); ordered[i].IsCorrect = input.Options[i].IsCorrect; ordered[i].DisplayOrder = i; }
            else q.Options.Add(new QuestionOption { Text = input.Options[i].Text.Trim(), IsCorrect = input.Options[i].IsCorrect, DisplayOrder = i });
        }
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
        return await GetQuestionAsync(id, ct);
    }

    public async Task SetQuestionActiveAsync(Guid id, bool active, CancellationToken ct)
    {
        var q = await db.Questions.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("Question", id);
        q.IsActive = active; q.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
    }

    // ----------------------------------------------------------- topics

    public async Task<Guid> CreateTopicAsync(AdminTopicInput input, CancellationToken ct)
    {
        ValidateSlug(input.Slug, input.Name);
        if (await db.Topics.AnyAsync(t => t.Slug == input.Slug, ct)) throw new ConflictException(Text.Get(Text.Keys.AdminTopicSlugExists));
        var order = (await db.Topics.MaxAsync(t => (int?)t.DisplayOrder, ct) ?? 0) + 1;
        var t = new Topic { Slug = input.Slug, Name = input.Name.Trim(), Description = input.Description, Category = input.Category, Icon = input.Icon, IsActive = input.IsActive, DisplayOrder = order };
        db.Topics.Add(t);
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
        return t.Id;
    }

    public async Task UpdateTopicAsync(string slug, AdminTopicInput input, CancellationToken ct)
    {
        var t = await db.Topics.FirstOrDefaultAsync(x => x.Slug == slug, ct) ?? throw new NotFoundException("Topic", slug);
        ValidateSlug(input.Slug, input.Name);
        if (input.Slug != slug && await db.Topics.AnyAsync(x => x.Slug == input.Slug, ct)) throw new ConflictException(Text.Get(Text.Keys.AdminSlugInUse));
        (t.Slug, t.Name, t.Description, t.Category, t.Icon, t.IsActive) = (input.Slug, input.Name.Trim(), input.Description, input.Category, input.Icon, input.IsActive);
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
    }

    public async Task<Guid> CreateSubtopicAsync(string topicSlug, AdminSubtopicInput input, CancellationToken ct)
    {
        ValidateSlug(input.Slug, input.Name);
        var t = await db.Topics.Include(x => x.Subtopics).FirstOrDefaultAsync(x => x.Slug == topicSlug, ct) ?? throw new NotFoundException("Topic", topicSlug);
        if (t.Subtopics.Any(s => s.Slug == input.Slug)) throw new ConflictException(Text.Get(Text.Keys.AdminSubtopicSlugExists));
        var s = new Subtopic { TopicId = t.Id, Slug = input.Slug, Name = input.Name.Trim(), DisplayOrder = t.Subtopics.Count + 1 };
        db.Subtopics.Add(s);
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
        return s.Id;
    }

    private static void ValidateSlug(string slug, string name)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(slug) || !SlugRx.IsMatch(slug) || slug.Length > 60) errors["slug"] = [Text.Get(Text.Keys.AdminSlugFormat)];
        if (string.IsNullOrWhiteSpace(name) || name.Length > 80) errors["name"] = [Text.Get(Text.Keys.AdminNameRequiredMax)];
        if (errors.Count > 0) throw new RequestValidationException(errors);
    }

    // ----------------------------------------------------------- roadmaps

    public async Task<Guid> CreateRoadmapAsync(AdminRoadmapInput input, CancellationToken ct)
    {
        ValidateSlug(input.Slug, input.Name);
        if (await db.Roadmaps.AnyAsync(r => r.Slug == input.Slug, ct)) throw new ConflictException(Text.Get(Text.Keys.AdminRoadmapSlugExists));
        var order = (await db.Roadmaps.MaxAsync(r => (int?)r.DisplayOrder, ct) ?? 0) + 1;
        var r = new Roadmap
        {
            Slug = input.Slug, Name = input.Name.Trim(), Description = input.Description, Category = input.Category, Difficulty = input.Difficulty,
            EstimatedHours = Math.Max(1, input.EstimatedHours), Icon = input.Icon, IsPublished = input.IsPublished, XPReward = input.XpReward, DisplayOrder = order,
        };
        db.Roadmaps.Add(r);
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
        return r.Id;
    }

    public async Task UpdateRoadmapAsync(string slug, AdminRoadmapInput input, CancellationToken ct)
    {
        var r = await db.Roadmaps.FirstOrDefaultAsync(x => x.Slug == slug, ct) ?? throw new NotFoundException("Roadmap", slug);
        ValidateSlug(input.Slug, input.Name);
        if (input.Slug != slug && await db.Roadmaps.AnyAsync(x => x.Slug == input.Slug, ct)) throw new ConflictException(Text.Get(Text.Keys.AdminSlugInUse));
        (r.Slug, r.Name, r.Description, r.Category, r.Difficulty, r.EstimatedHours, r.Icon, r.IsPublished, r.XPReward) =
            (input.Slug, input.Name.Trim(), input.Description, input.Category, input.Difficulty, Math.Max(1, input.EstimatedHours), input.Icon, input.IsPublished, input.XpReward);
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
    }

    /// <summary>Adds a step to a module of the roadmap, or to a new Context module appended to the roadmap.</summary>
    public async Task<Guid> AddStepAsync(string roadmapSlug, AdminStepInput input, CancellationToken ct)
    {
        var r = await db.Roadmaps.Include(x => x.Links).FirstOrDefaultAsync(x => x.Slug == roadmapSlug, ct) ?? throw new NotFoundException("Roadmap", roadmapSlug);
        await ValidateStepAsync(input, ct);

        LearningModule module;
        if (input.ModuleId is { } mid)
        {
            if (r.Links.All(l => l.ModuleId != mid)) throw RequestValidationException.For("moduleId", Text.Get(Text.Keys.AdminModuleNotInRoadmap));
            module = await db.LearningModules.FirstAsync(m => m.Id == mid, ct);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(input.NewModuleTitle)) throw RequestValidationException.For("newModuleTitle", Text.Get(Text.Keys.AdminModuleRequired));
            module = new LearningModule
            {
                Slug = await UniqueModuleSlugAsync($"{r.Slug}-{Slugify(input.NewModuleTitle)}", ct), Name = input.NewModuleTitle.Trim(),
                Kind = ModuleKind.Context, Category = r.Category, Level = r.Difficulty, XPReward = options.Value.RoadmapModuleXp,
                SeedManaged = false, DisplayOrder = (await db.LearningModules.MaxAsync(m => (int?)m.DisplayOrder, ct) ?? 0) + 1,
            };
            db.LearningModules.Add(module);
            r.Links.Add(new RoadmapModuleLink { RoadmapId = r.Id, ModuleId = module.Id, Order = r.Links.Select(l => l.Order).DefaultIfEmpty(0).Max() + 1 });
            r.CompositionSeedManaged = false;
        }

        var stepId = await AddModuleStepCoreAsync(module, input, ct);
        await db.SaveChangesAsync(ct);
        await RecountRoadmapsAsync([module.Id], ct);
        await InvalidateAsync(ct);
        return stepId;
    }

    public async Task UpdateStepAsync(Guid stepId, AdminStepInput input, CancellationToken ct)
    {
        var step = await db.ModuleSteps.FirstOrDefaultAsync(s => s.Id == stepId, ct) ?? throw new NotFoundException("Roadmap step", stepId);
        var (topicId, subId) = await ValidateStepAsync(input, ct);
        step.Title = input.Title.Trim(); step.Description = input.Description; step.Difficulty = input.Difficulty;
        step.EstimatedMinutes = input.EstimatedMinutes; step.TopicId = topicId; step.SubtopicId = subId;
        step.MinimumQuestions = input.MinimumQuestions; step.MinimumAccuracy = input.MinimumAccuracy; step.XPReward = input.XpReward;
        step.IsActive = input.IsActive;
        var module = await db.LearningModules.FirstAsync(m => m.Id == step.ModuleId, ct);
        module.SeedManaged = false;
        await db.SaveChangesAsync(ct);
        await RecountRoadmapsAsync([module.Id], ct);
        await InvalidateAsync(ct);
    }

    // ----------------------------------------------------------- module catalog

    public async Task<IReadOnlyList<AdminModuleDto>> ListModulesAsync(ModuleKind? kind, CancellationToken ct)
    {
        var q = db.LearningModules.AsNoTracking().Include(m => m.Steps).AsQueryable();
        if (kind is not null) q = q.Where(m => m.Kind == kind);
        var modules = await q.OrderBy(m => m.DisplayOrder).ThenBy(m => m.Slug).ToListAsync(ct);
        return await ToAdminDtosAsync(modules, ct);
    }

    public async Task<AdminModuleDto> GetModuleAsync(string slug, CancellationToken ct)
    {
        var m = await db.LearningModules.AsNoTracking().Include(x => x.Steps).FirstOrDefaultAsync(x => x.Slug == slug, ct)
            ?? throw new NotFoundException("Module", slug);
        return (await ToAdminDtosAsync([m], ct))[0];
    }

    private async Task<List<AdminModuleDto>> ToAdminDtosAsync(List<LearningModule> modules, CancellationToken ct)
    {
        var ids = modules.Select(m => m.Id).ToList();
        var usage = await (from l in db.RoadmapModuleLinks.AsNoTracking() where ids.Contains(l.ModuleId)
                           join r in db.Roadmaps on l.RoadmapId equals r.Id
                           select new { l.ModuleId, r.Slug }).ToListAsync(ct);
        var topics = await db.Topics.AsNoTracking().Include(t => t.Subtopics).ToListAsync(ct);
        string TopicSlug(Guid id) => topics.First(t => t.Id == id).Slug;
        string? SubSlug(Guid? id) => id is null ? null : topics.SelectMany(t => t.Subtopics).First(s => s.Id == id).Slug;
        return modules.Select(m => new AdminModuleDto(m.Id, m.Slug, m.Name, m.Description, m.Kind, m.Category, m.Level, m.Icon, m.IsPublished,
            m.IsStandalone, m.XPReward, m.Version, m.SeedManaged, usage.Where(u => u.ModuleId == m.Id).Select(u => u.Slug).ToList(),
            m.Steps.OrderBy(s => s.Order).Select(s => new AdminModuleStepDto(s.Id, s.Order, s.Title, s.Description, s.Difficulty, s.EstimatedMinutes,
                TopicSlug(s.TopicId), SubSlug(s.SubtopicId), s.MinimumQuestions, s.MinimumAccuracy, s.XPReward, s.IsActive, s.AddedInVersion)).ToList()))
            .ToList();
    }

    public async Task<Guid> CreateModuleAsync(AdminModuleInput input, CancellationToken ct)
    {
        ValidateModule(input);
        if (await db.LearningModules.AnyAsync(m => m.Slug == input.Slug, ct)) throw new ConflictException(Text.Get(Text.Keys.AdminSlugInUse));
        var m = new LearningModule
        {
            Slug = input.Slug, Name = input.Name.Trim(), Description = input.Description, Kind = input.Kind, Category = input.Category, Level = input.Level,
            Icon = input.Icon, IsPublished = input.IsPublished, IsStandalone = input.IsStandalone, XPReward = input.XpReward, SeedManaged = false,
            DisplayOrder = (await db.LearningModules.MaxAsync(x => (int?)x.DisplayOrder, ct) ?? 0) + 1,
        };
        db.LearningModules.Add(m);
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
        return m.Id;
    }

    public async Task UpdateModuleAsync(string slug, AdminModuleInput input, CancellationToken ct)
    {
        var m = await db.LearningModules.FirstOrDefaultAsync(x => x.Slug == slug, ct) ?? throw new NotFoundException("Module", slug);
        ValidateModule(input);
        if (input.Slug != slug && await db.LearningModules.AnyAsync(x => x.Slug == input.Slug, ct)) throw new ConflictException(Text.Get(Text.Keys.AdminSlugInUse));
        (m.Slug, m.Name, m.Description, m.Kind, m.Category, m.Level, m.Icon, m.IsPublished, m.IsStandalone, m.XPReward) =
            (input.Slug, input.Name.Trim(), input.Description, input.Kind, input.Category, input.Level, input.Icon, input.IsPublished, input.IsStandalone, input.XpReward);
        m.SeedManaged = false;
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
    }

    public async Task<Guid> AddModuleStepAsync(string moduleSlug, AdminStepInput input, CancellationToken ct)
    {
        var module = await db.LearningModules.FirstOrDefaultAsync(m => m.Slug == moduleSlug, ct) ?? throw new NotFoundException("Module", moduleSlug);
        await ValidateStepAsync(input, ct);
        var id = await AddModuleStepCoreAsync(module, input, ct);
        await db.SaveChangesAsync(ct);
        await RecountRoadmapsAsync([module.Id], ct);
        await InvalidateAsync(ct);
        return id;
    }

    /// <summary>
    /// Inserts a step at the requested position. Adding to a module that already has steps bumps its version: learners who
    /// completed the previous version keep their completion and XP and see the step as new content.
    /// </summary>
    private async Task<Guid> AddModuleStepCoreAsync(LearningModule module, AdminStepInput input, CancellationToken ct)
    {
        var (topicId, subId) = await ValidateStepAsync(input, ct);
        var steps = await db.ModuleSteps.Where(s => s.ModuleId == module.Id).OrderBy(s => s.Order).ToListAsync(ct);
        if (steps.Count > 0) module.Version++;
        var order = Math.Clamp(input.Order ?? steps.Count + 1, 1, steps.Count + 1);
        foreach (var s in steps.Where(s => s.Order >= order)) s.Order++;
        var step = new ModuleStep
        {
            ModuleId = module.Id, Title = input.Title.Trim(), Description = input.Description, Order = order, Difficulty = input.Difficulty,
            EstimatedMinutes = input.EstimatedMinutes, TopicId = topicId, SubtopicId = subId, MinimumQuestions = input.MinimumQuestions,
            MinimumAccuracy = input.MinimumAccuracy, XPReward = input.XpReward, IsActive = input.IsActive, AddedInVersion = module.Version,
        };
        db.ModuleSteps.Add(step);
        module.SeedManaged = false;
        return step.Id;
    }

    // ----------------------------------------------------------- roadmap composition

    public async Task<AdminCompositionDto> GetCompositionAsync(string roadmapSlug, CancellationToken ct)
    {
        var r = await db.Roadmaps.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == roadmapSlug, ct) ?? throw new NotFoundException("Roadmap", roadmapSlug);
        var links = await (from l in db.RoadmapModuleLinks.AsNoTracking() where l.RoadmapId == r.Id
                           join m in db.LearningModules on l.ModuleId equals m.Id
                           orderby l.Order
                           select new AdminRoadmapLinkDto(m.Slug, m.Name, m.Kind, l.Order, l.IsRequired, m.Steps.Count(s => s.IsActive))).ToListAsync(ct);
        return new AdminCompositionDto(r.Slug, r.CompositionSeedManaged, links);
    }

    public async Task AddRoadmapModuleAsync(string roadmapSlug, AdminRoadmapLinkInput input, CancellationToken ct)
    {
        var r = await db.Roadmaps.Include(x => x.Links).FirstOrDefaultAsync(x => x.Slug == roadmapSlug, ct) ?? throw new NotFoundException("Roadmap", roadmapSlug);
        var m = await db.LearningModules.FirstOrDefaultAsync(x => x.Slug == input.ModuleSlug, ct)
            ?? throw RequestValidationException.For("moduleSlug", Text.Get(Text.Keys.AdminUnknownModule));
        if (r.Links.Any(l => l.ModuleId == m.Id)) throw new ConflictException(Text.Get(Text.Keys.AdminModuleAlreadyInRoadmap));
        var ordered = r.Links.OrderBy(l => l.Order).Select(l => (l.ModuleId, l.IsRequired)).ToList();
        ordered.Insert(Math.Clamp((input.Order ?? ordered.Count + 1) - 1, 0, ordered.Count), (m.Id, input.IsRequired));
        await ApplyCompositionAsync(r, ordered, ct);
    }

    public async Task RemoveRoadmapModuleAsync(string roadmapSlug, string moduleSlug, CancellationToken ct)
    {
        var r = await db.Roadmaps.Include(x => x.Links).FirstOrDefaultAsync(x => x.Slug == roadmapSlug, ct) ?? throw new NotFoundException("Roadmap", roadmapSlug);
        var m = await db.LearningModules.FirstOrDefaultAsync(x => x.Slug == moduleSlug, ct) ?? throw new NotFoundException("Module", moduleSlug);
        if (r.Links.All(l => l.ModuleId != m.Id)) throw new NotFoundException("Module", moduleSlug);
        await ApplyCompositionAsync(r, r.Links.Where(l => l.ModuleId != m.Id).OrderBy(l => l.Order).Select(l => (l.ModuleId, l.IsRequired)).ToList(), ct);
    }

    public async Task SetCompositionAsync(string roadmapSlug, AdminCompositionInput input, CancellationToken ct)
    {
        var r = await db.Roadmaps.Include(x => x.Links).FirstOrDefaultAsync(x => x.Slug == roadmapSlug, ct) ?? throw new NotFoundException("Roadmap", roadmapSlug);
        var slugs = input.Modules.Select(x => x.ModuleSlug).ToList();
        if (slugs.Distinct().Count() != slugs.Count) throw RequestValidationException.For("modules", Text.Get(Text.Keys.AdminModuleAlreadyInRoadmap));
        var modules = await db.LearningModules.Where(m => slugs.Contains(m.Slug)).ToDictionaryAsync(m => m.Slug, ct);
        var unknown = slugs.FirstOrDefault(sl => !modules.ContainsKey(sl));
        if (unknown is not null) throw RequestValidationException.For("modules", Text.Get(Text.Keys.AdminUnknownModule));
        await ApplyCompositionAsync(r, input.Modules.Select(x => (modules[x.ModuleSlug].Id, x.IsRequired)).ToList(), ct);
    }

    /// <summary>Replaces the roadmap's links with <paramref name="ordered"/> (orders 1..n). The composition stops following the seed.</summary>
    private async Task ApplyCompositionAsync(Roadmap r, List<(Guid ModuleId, bool IsRequired)> ordered, CancellationToken ct)
    {
        // Two steps keep the unique (roadmap, order) index valid while orders move.
        db.RoadmapModuleLinks.RemoveRange(r.Links);
        await db.SaveChangesAsync(ct);
        r.Links.Clear();
        for (var i = 0; i < ordered.Count; i++)
            db.RoadmapModuleLinks.Add(new RoadmapModuleLink { RoadmapId = r.Id, ModuleId = ordered[i].ModuleId, Order = i + 1, IsRequired = ordered[i].IsRequired });
        r.CompositionSeedManaged = false;
        await db.SaveChangesAsync(ct);
        await RecountRoadmapsAsync(ordered.Select(o => o.ModuleId).ToList(), ct, r.Id);
        await InvalidateAsync(ct);
    }

    /// <summary>Recomputes <see cref="Roadmap.StepsCount"/> (steps of required modules) for roadmaps containing the modules.</summary>
    private async Task RecountRoadmapsAsync(List<Guid> moduleIds, CancellationToken ct, Guid? alsoRoadmap = null)
    {
        var roadmapIds = await db.RoadmapModuleLinks.Where(l => moduleIds.Contains(l.ModuleId)).Select(l => l.RoadmapId).Distinct().ToListAsync(ct);
        if (alsoRoadmap is { } extra && !roadmapIds.Contains(extra)) roadmapIds.Add(extra);
        foreach (var r in await db.Roadmaps.Where(x => roadmapIds.Contains(x.Id)).ToListAsync(ct))
            r.StepsCount = await db.RoadmapModuleLinks.Where(l => l.RoadmapId == r.Id && l.IsRequired)
                .SumAsync(l => db.ModuleSteps.Count(s => s.ModuleId == l.ModuleId && s.IsActive), ct);
        await db.SaveChangesAsync(ct);
    }

    private static void ValidateModule(AdminModuleInput input)
    {
        ValidateSlug(input.Slug, input.Name);
        if (input.XpReward is < 0 or > 5000) throw RequestValidationException.For("xpReward", Text.Get(Text.Keys.AdminXpRange, 5000));
    }

    private async Task<string> UniqueModuleSlugAsync(string baseSlug, CancellationToken ct)
    {
        var slug = baseSlug.Length > 70 ? baseSlug[..70].TrimEnd('-') : baseSlug;
        var candidate = slug;
        for (var i = 2; await db.LearningModules.AnyAsync(m => m.Slug == candidate, ct); i++) candidate = $"{slug}-{i}";
        return candidate;
    }

    private static string Slugify(string text) =>
        System.Text.RegularExpressions.Regex.Replace(text.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-') is { Length: > 0 } x ? x : "module";

    private async Task<(Guid, Guid?)> ValidateStepAsync(AdminStepInput input, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(input.Title)) errors["title"] = [Text.Get(Text.Keys.AdminTitleRequired)];
        if (input.MinimumQuestions is < 1 or > 100) errors["minimumQuestions"] = [Text.Get(Text.Keys.AdminRange, 1, 100)];
        if (input.MinimumAccuracy is < 0 or > 100) errors["minimumAccuracy"] = [Text.Get(Text.Keys.AdminRange, 0, 100)];
        if (input.XpReward is < 0 or > 5000) errors["xpReward"] = [Text.Get(Text.Keys.AdminXpRange, 5000)];
        var topic = await db.Topics.Include(t => t.Subtopics).FirstOrDefaultAsync(t => t.Slug == input.TopicSlug, ct);
        Guid? subId = null;
        if (topic is null) errors["topicSlug"] = [Text.Get(Text.Keys.AdminUnknownTopic)];
        else if (!string.IsNullOrWhiteSpace(input.SubtopicSlug))
        {
            subId = topic.Subtopics.FirstOrDefault(s => s.Slug == input.SubtopicSlug)?.Id;
            if (subId is null) errors["subtopicSlug"] = [Text.Get(Text.Keys.AdminUnknownSubtopic)];
        }
        if (errors.Count > 0) throw new RequestValidationException(errors);
        return (topic!.Id, subId);
    }

    // ----------------------------------------------------------- users

    public async Task<PagedResult<AdminUserDto>> ListUsersAsync(string? search, int? page, int? pageSize, CancellationToken ct)
    {
        var (p, size) = Paging.Normalize(page, pageSize);
        var q = db.UserProfiles.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(u => u.Username.Contains(s) || u.Email.ToLower().Contains(s) || u.DisplayName.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(u => u.CreatedAt).Skip((p - 1) * size).Take(size)
            .Select(u => new AdminUserDto(u.Id, u.Username, u.DisplayName, u.Email, u.CurrentGlobalLevel, u.CurrentGlobalXP, u.QuestionsAnswered,
                u.GlobalAccuracy, u.CreatedAt, u.LastLoginAt)).ToListAsync(ct);
        return new PagedResult<AdminUserDto>(items, p, size, total);
    }
}
