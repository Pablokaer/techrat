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

public sealed record AdminStepInput(Guid? ModuleId, string? NewModuleTitle, string Title, string Description, Difficulty Difficulty,
    int EstimatedMinutes, string TopicSlug, string? SubtopicSlug, int MinimumQuestions, int MinimumAccuracy, int XpReward, int? Order);

public sealed record AdminUserDto(Guid Id, string Username, string DisplayName, string Email, int Level, long Xp, int QuestionsAnswered,
    double Accuracy, DateTimeOffset CreatedAt, DateTimeOffset? LastLoginAt);

public sealed record AdminStatsDto(int Users, int Topics, int Subtopics, int Questions, int ActiveQuestions, int Roadmaps, int Steps, int Attempts);

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
        await db.Questions.CountAsync(q => q.IsActive, ct), await db.Roadmaps.CountAsync(ct), await db.RoadmapSteps.CountAsync(ct),
        await db.QuestionAttempts.CountAsync(ct));

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

    public async Task<Guid> AddStepAsync(string roadmapSlug, AdminStepInput input, CancellationToken ct)
    {
        var r = await db.Roadmaps.FirstOrDefaultAsync(x => x.Slug == roadmapSlug, ct) ?? throw new NotFoundException("Roadmap", roadmapSlug);
        var (topicId, subId) = await ValidateStepAsync(input, ct);

        Guid moduleId;
        if (input.ModuleId is { } mid)
        {
            if (!await db.RoadmapModules.AnyAsync(m => m.Id == mid && m.RoadmapId == r.Id, ct)) throw RequestValidationException.For("moduleId", Text.Get(Text.Keys.AdminModuleNotInRoadmap));
            moduleId = mid;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(input.NewModuleTitle)) throw RequestValidationException.For("newModuleTitle", Text.Get(Text.Keys.AdminModuleRequired));
            var mOrder = (await db.RoadmapModules.Where(m => m.RoadmapId == r.Id).MaxAsync(m => (int?)m.Order, ct) ?? 0) + 1;
            var module = new RoadmapModule { RoadmapId = r.Id, Title = input.NewModuleTitle.Trim(), Order = mOrder, XPReward = options.Value.RoadmapModuleXp };
            db.RoadmapModules.Add(module);
            moduleId = module.Id;
        }

        var steps = await db.RoadmapSteps.Where(s => s.RoadmapId == r.Id).OrderBy(s => s.Order).ToListAsync(ct);
        var order = Math.Clamp(input.Order ?? steps.Count + 1, 1, steps.Count + 1);
        foreach (var s in steps.Where(s => s.Order >= order)) s.Order++;
        var step = new RoadmapStep
        {
            RoadmapId = r.Id, ModuleId = moduleId, Title = input.Title.Trim(), Description = input.Description, Order = order, Difficulty = input.Difficulty,
            EstimatedMinutes = input.EstimatedMinutes, TopicId = topicId, SubtopicId = subId, MinimumQuestions = input.MinimumQuestions,
            MinimumAccuracy = input.MinimumAccuracy, XPReward = input.XpReward,
        };
        db.RoadmapSteps.Add(step);
        r.StepsCount = steps.Count + 1;
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
        return step.Id;
    }

    public async Task UpdateStepAsync(Guid stepId, AdminStepInput input, CancellationToken ct)
    {
        var step = await db.RoadmapSteps.FirstOrDefaultAsync(s => s.Id == stepId, ct) ?? throw new NotFoundException("Roadmap step", stepId);
        var (topicId, subId) = await ValidateStepAsync(input, ct);
        step.Title = input.Title.Trim(); step.Description = input.Description; step.Difficulty = input.Difficulty;
        step.EstimatedMinutes = input.EstimatedMinutes; step.TopicId = topicId; step.SubtopicId = subId;
        step.MinimumQuestions = input.MinimumQuestions; step.MinimumAccuracy = input.MinimumAccuracy; step.XPReward = input.XpReward;
        if (input.ModuleId is { } mid && await db.RoadmapModules.AnyAsync(m => m.Id == mid && m.RoadmapId == step.RoadmapId, ct)) step.ModuleId = mid;
        await db.SaveChangesAsync(ct);
        await InvalidateAsync(ct);
    }

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
