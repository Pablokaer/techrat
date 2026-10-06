using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Application.Identity;
using TechRat.Domain.Common;
using TechRat.Domain.Content;
using TechRat.Domain.Gamification;
using TechRat.Domain.Roadmaps;
using TechRat.Domain.Users;
using TechRat.Infrastructure.Persistence;

namespace TechRat.Infrastructure.Seed;

public sealed record SeedReport(
    int TopicsAdded, int SubtopicsAdded, int QuestionsAdded, int RoadmapsAdded, int StepsAdded, int AchievementsAdded, int TranslationsAdded);

/// <summary>
/// Idempotent seed. Records are matched by natural keys (slug / external key / code) and only missing ones are inserted,
/// so restarts never duplicate data and admin edits to existing records are preserved.
/// </summary>
public sealed class DatabaseSeeder(
    AppDbContext db,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    IOptions<GamificationOptions> options,
    IConfiguration configuration,
    TimeProvider clock,
    ILogger<DatabaseSeeder> logger)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly GamificationOptions _o = options.Value;

    // JSON shapes ---------------------------------------------------------------
    private sealed record TopicJson(string Slug, string Name, string Category, string Icon, string Description, int Order, List<SubtopicJson> Subtopics);
    private sealed record SubtopicJson(string Slug, string Name, int Order);
    private sealed record QuestionJson(string Id, string Topic, string Subtopic, string Difficulty, string Title, string Question,
        List<string> Options, int CorrectIndex, string Explanation, string ReferenceUrl);
    private sealed record RoadmapJson(string Slug, string Name, string Category, string Difficulty, string Icon, string Description,
        int EstimatedHours, List<PrereqJson> Prerequisites, List<ModuleJson> Modules);
    private sealed record PrereqJson(string Slug, int MinimumPercent);
    private sealed record ModuleJson(string Title, int Order, List<StepJson> Steps);
    private sealed record StepJson(string Topic, string? Subtopic, string Title, int Order, int EstimatedMinutes);
    private sealed record AchievementJson(string Code, string Name, string Description, string RuleType, int Threshold, string? TargetSlug,
        int? SecondaryThreshold, string Tier, string Icon, int XpReward, string Category);

    // i18n/<locale>.json: catalog translations keyed by slug / code / order.
    private sealed record TranslationJson(
        Dictionary<string, TopicTranslationJson>? Topics, Dictionary<string, RoadmapTranslationJson>? Roadmaps,
        Dictionary<string, AchievementTranslationJson>? Achievements);
    private sealed record TopicTranslationJson(string? Name, string? Description, string? Category, Dictionary<string, string>? Subtopics);
    private sealed record RoadmapTranslationJson(string? Name, string? Description, string? Category,
        Dictionary<string, string>? Modules, Dictionary<string, string>? Steps);
    private sealed record AchievementTranslationJson(string? Name, string? Description, string? Category);
    private const string TranslationResourcePrefix = ".Seed.Data.i18n.";

    private static T Load<T>(string name)
    {
        var asm = typeof(DatabaseSeeder).Assembly;
        var resource = asm.GetManifestResourceNames().Single(n => n.EndsWith(name, StringComparison.Ordinal));
        using var stream = asm.GetManifestResourceStream(resource)!;
        return JsonSerializer.Deserialize<T>(stream, Json)!;
    }

    private static IEnumerable<List<QuestionJson>> LoadQuestionFiles()
    {
        var asm = typeof(DatabaseSeeder).Assembly;
        foreach (var name in asm.GetManifestResourceNames().Where(n => n.Contains(".Seed.Data.questions.")).Order())
        {
            using var stream = asm.GetManifestResourceStream(name)!;
            yield return JsonSerializer.Deserialize<List<QuestionJson>>(stream, Json)!;
        }
    }

    public async Task<SeedReport> SeedAsync(CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var now = clock.GetUtcNow();

        // Topics & subtopics --------------------------------------------------
        int topicsAdded = 0, subsAdded = 0;
        var topics = await db.Topics.Include(t => t.Subtopics).ToListAsync(ct);
        foreach (var tj in Load<List<TopicJson>>("topics.json"))
        {
            var topic = topics.FirstOrDefault(t => t.Slug == tj.Slug);
            if (topic is null)
            {
                topic = new Topic { Slug = tj.Slug, Name = tj.Name, Category = tj.Category, Icon = tj.Icon, Description = tj.Description, DisplayOrder = tj.Order };
                db.Topics.Add(topic); topics.Add(topic); topicsAdded++;
            }
            foreach (var sj in tj.Subtopics.Where(sj => topic.Subtopics.All(s => s.Slug != sj.Slug)))
            {
                topic.Subtopics.Add(new Subtopic { Slug = sj.Slug, Name = sj.Name, DisplayOrder = sj.Order, TopicId = topic.Id });
                subsAdded++;
            }
        }
        await db.SaveChangesAsync(ct);

        // Questions ------------------------------------------------------------
        var existingKeys = (await db.Questions.Where(q => q.ExternalKey != null).Select(q => q.ExternalKey!).ToListAsync(ct)).ToHashSet();
        var questionsAdded = 0;
        foreach (var file in LoadQuestionFiles())
        foreach (var qj in file.Where(q => !existingKeys.Contains(q.Id)))
        {
            var topic = topics.First(t => t.Slug == qj.Topic);
            var sub = topic.Subtopics.First(s => s.Slug == qj.Subtopic);
            var difficulty = Enum.Parse<Difficulty>(qj.Difficulty);
            if (qj.Options.Count != 4 || qj.CorrectIndex is < 0 or > 3)
                throw new InvalidOperationException($"Seed question {qj.Id} is malformed.");
            db.Questions.Add(new Question
            {
                ExternalKey = qj.Id, TopicId = topic.Id, SubtopicId = sub.Id, Difficulty = difficulty, QuestionType = QuestionType.MultipleChoice,
                Title = qj.Title, QuestionText = qj.Question, Explanation = qj.Explanation, ReferenceUrl = qj.ReferenceUrl,
                XPReward = _o.XpFor(difficulty), IsActive = true, CreatedAt = now, UpdatedAt = now,
                Options = qj.Options.Select((text, i) => new QuestionOption { Text = text, IsCorrect = i == qj.CorrectIndex, DisplayOrder = i }).ToList(),
            });
            existingKeys.Add(qj.Id);
            questionsAdded++;
        }
        await db.SaveChangesAsync(ct);

        // Roadmaps --------------------------------------------------------------
        var questionCounts = await db.Questions.Where(q => q.IsActive)
            .GroupBy(q => new { q.TopicId, q.SubtopicId }).Select(g => new { g.Key.TopicId, g.Key.SubtopicId, Count = g.Count() }).ToListAsync(ct);
        int Available(Guid topicId, Guid? subId) => questionCounts.Where(c => c.TopicId == topicId && (subId == null || c.SubtopicId == subId)).Sum(c => c.Count);

        var roadmapJson = Load<List<RoadmapJson>>("roadmaps.json");
        var roadmaps = await db.Roadmaps.ToListAsync(ct);
        int roadmapsAdded = 0, stepsAdded = 0, order = roadmaps.Count;
        foreach (var rj in roadmapJson.Where(rj => roadmaps.All(r => r.Slug != rj.Slug)))
        {
            var difficulty = Enum.Parse<RoadmapDifficulty>(rj.Difficulty);
            var roadmap = new Roadmap
            {
                Slug = rj.Slug, Name = rj.Name, Category = rj.Category, Difficulty = difficulty, Icon = rj.Icon, Description = rj.Description,
                EstimatedHours = rj.EstimatedHours, IsPublished = true, DisplayOrder = ++order, XPReward = _o.RoadmapCompletedXp,
            };
            foreach (var mj in rj.Modules)
            {
                var module = new RoadmapModule { RoadmapId = roadmap.Id, Title = mj.Title, Order = mj.Order, XPReward = _o.RoadmapModuleXp };
                roadmap.Modules.Add(module);
                foreach (var sj in mj.Steps)
                {
                    var topic = topics.First(t => t.Slug == sj.Topic);
                    var sub = sj.Subtopic is null ? null : topic.Subtopics.First(s => s.Slug == sj.Subtopic);
                    var available = Available(topic.Id, sub?.Id);
                    if (available == 0) throw new InvalidOperationException($"Roadmap {rj.Slug} step {sj.Title} has no questions.");
                    roadmap.Steps.Add(new RoadmapStep
                    {
                        RoadmapId = roadmap.Id, ModuleId = module.Id, Title = sj.Title, Order = sj.Order, EstimatedMinutes = sj.EstimatedMinutes,
                        Description = DefaultStepDescription(topic.Name, sub?.Name),
                        Difficulty = difficulty switch
                        {
                            RoadmapDifficulty.Beginner => Difficulty.Easy, RoadmapDifficulty.Intermediate => Difficulty.Medium,
                            RoadmapDifficulty.Advanced => Difficulty.Hard, _ => Difficulty.Expert,
                        },
                        TopicId = topic.Id, SubtopicId = sub?.Id,
                        // Never require more questions than exist in the step's scope.
                        MinimumQuestions = Math.Min(_o.DefaultStepMinimumQuestions, available),
                        MinimumAccuracy = _o.DefaultStepMinimumAccuracy,
                        XPReward = _o.RoadmapStepXp,
                    });
                    stepsAdded++;
                }
            }
            roadmap.StepsCount = roadmap.Steps.Count;
            db.Roadmaps.Add(roadmap); roadmaps.Add(roadmap); roadmapsAdded++;
        }
        await db.SaveChangesAsync(ct);

        var deps = await db.RoadmapDependencies.ToListAsync(ct);
        foreach (var rj in roadmapJson)
        {
            var roadmap = roadmaps.First(r => r.Slug == rj.Slug);
            foreach (var p in rj.Prerequisites)
            {
                var required = roadmaps.First(r => r.Slug == p.Slug);
                if (deps.Any(d => d.RoadmapId == roadmap.Id && d.RequiredRoadmapId == required.Id)) continue;
                var dep = new RoadmapDependency { RoadmapId = roadmap.Id, RequiredRoadmapId = required.Id, MinimumPercent = p.MinimumPercent };
                db.RoadmapDependencies.Add(dep); deps.Add(dep);
            }
        }

        // Achievements ----------------------------------------------------------
        var codes = (await db.Achievements.Select(a => a.Code).ToListAsync(ct)).ToHashSet();
        var achievementsAdded = 0;
        foreach (var aj in Load<List<AchievementJson>>("achievements.json").Where(a => !codes.Contains(a.Code)))
        {
            db.Achievements.Add(new Achievement
            {
                Code = aj.Code, Name = aj.Name, Description = aj.Description, Category = aj.Category, Icon = aj.Icon,
                Tier = Enum.Parse<BadgeTier>(aj.Tier), RuleType = Enum.Parse<AchievementRuleType>(aj.RuleType), Threshold = aj.Threshold,
                TargetSlug = aj.TargetSlug, SecondaryThreshold = aj.SecondaryThreshold, XPReward = aj.XpReward,
            });
            achievementsAdded++;
        }
        await db.SaveChangesAsync(ct);

        var translationsAdded = await SeedTranslationsAsync(topics, ct);
        await tx.CommitAsync(ct);

        await SeedIdentityAsync(now);

        var report = new SeedReport(topicsAdded, subsAdded, questionsAdded, roadmapsAdded, stepsAdded, achievementsAdded, translationsAdded);
        logger.LogInformation("Seed completed {@SeedReport}", report);
        return report;
    }

    /// <summary>
    /// Inserts missing catalog translations from every <c>Seed/Data/i18n/&lt;locale&gt;.json</c>.
    /// Existing rows are never overwritten, so edited translations survive restarts.
    /// </summary>
    private async Task<int> SeedTranslationsAsync(List<Topic> topics, CancellationToken ct)
    {
        var asm = typeof(DatabaseSeeder).Assembly;
        var roadmaps = await db.Roadmaps.Include(r => r.Modules).Include(r => r.Steps).ToListAsync(ct);
        var achievements = await db.Achievements.ToListAsync(ct);
        var added = 0;

        foreach (var resource in asm.GetManifestResourceNames().Where(n => n.Contains(TranslationResourcePrefix, StringComparison.Ordinal)).Order())
        {
            var file = resource[(resource.IndexOf(TranslationResourcePrefix, StringComparison.Ordinal) + TranslationResourcePrefix.Length)..];
            var locale = Path.GetFileNameWithoutExtension(file);
            if (locale == AppLocales.Default || !AppLocales.Supported.Contains(locale))
            {
                logger.LogWarning("Skipping translation file {File}: {Locale} is not a supported non-default locale", file, locale);
                continue;
            }

            TranslationJson data;
            await using (var stream = asm.GetManifestResourceStream(resource)!)
                data = (await JsonSerializer.DeserializeAsync<TranslationJson>(stream, Json, ct))!;

            var existing = (await db.ContentTranslations.Where(t => t.Locale == locale)
                    .Select(t => new { t.EntityType, t.EntityId, t.Field }).ToListAsync(ct))
                .Select(t => (t.EntityType, t.EntityId, t.Field)).ToHashSet();

            void Add(string entityType, Guid id, string field, string? value)
            {
                if (string.IsNullOrWhiteSpace(value) || !existing.Add((entityType, id, field))) return;
                db.ContentTranslations.Add(new ContentTranslation { EntityType = entityType, EntityId = id, Locale = locale, Field = field, Value = value.Trim() });
                added++;
            }

            var topicTr = data.Topics ?? [];
            foreach (var topic in topics)
            {
                if (!topicTr.TryGetValue(topic.Slug, out var tt)) continue;
                Add(TranslatableEntity.Topic, topic.Id, TranslatableField.Name, tt.Name);
                Add(TranslatableEntity.Topic, topic.Id, TranslatableField.Description, tt.Description);
                Add(TranslatableEntity.Topic, topic.Id, TranslatableField.Category, tt.Category);
                foreach (var sub in topic.Subtopics)
                    if (tt.Subtopics?.TryGetValue(sub.Slug, out var subName) == true)
                        Add(TranslatableEntity.Subtopic, sub.Id, TranslatableField.Name, subName);
            }

            foreach (var roadmap in roadmaps)
            {
                if (data.Roadmaps?.TryGetValue(roadmap.Slug, out var rt) != true) continue;
                Add(TranslatableEntity.Roadmap, roadmap.Id, TranslatableField.Name, rt!.Name);
                Add(TranslatableEntity.Roadmap, roadmap.Id, TranslatableField.Description, rt.Description);
                Add(TranslatableEntity.Roadmap, roadmap.Id, TranslatableField.Category, rt.Category);
                foreach (var module in roadmap.Modules)
                    if (rt.Modules?.TryGetValue(module.Order.ToString(), out var title) == true)
                        Add(TranslatableEntity.RoadmapModule, module.Id, TranslatableField.Title, title);
                foreach (var step in roadmap.Steps)
                {
                    if (rt.Steps?.TryGetValue(step.Order.ToString(), out var title) == true)
                        Add(TranslatableEntity.RoadmapStep, step.Id, TranslatableField.Title, title);
                    Add(TranslatableEntity.RoadmapStep, step.Id, TranslatableField.Description, StepDescription(step, topics, topicTr, locale));
                }
            }

            foreach (var achievement in achievements)
            {
                if (data.Achievements?.TryGetValue(achievement.Code, out var at) != true) continue;
                Add(TranslatableEntity.Achievement, achievement.Id, TranslatableField.Name, at!.Name);
                Add(TranslatableEntity.Achievement, achievement.Id, TranslatableField.Description, at.Description);
                Add(TranslatableEntity.Achievement, achievement.Id, TranslatableField.Category, at.Category);
            }
        }

        await db.SaveChangesAsync(ct);
        return added;
    }

    /// <summary>The generated step description in <paramref name="locale"/>; null when an admin replaced the generated English text.</summary>
    private static string? StepDescription(RoadmapStep step, List<Topic> topics, Dictionary<string, TopicTranslationJson> topicTr, string locale)
    {
        var topic = topics.FirstOrDefault(t => t.Id == step.TopicId);
        if (topic is null) return null;
        var sub = step.SubtopicId is { } sid ? topic.Subtopics.FirstOrDefault(s => s.Id == sid) : null;
        if (step.Description != DefaultStepDescription(topic.Name, sub?.Name)) return null;

        var tt = topicTr.GetValueOrDefault(topic.Slug);
        var topicName = tt?.Name ?? topic.Name;
        var subName = sub is null ? null : tt?.Subtopics?.GetValueOrDefault(sub.Slug) ?? sub.Name;
        return locale == AppLocales.PortugueseBrazil
            ? subName is null ? $"Pratique questões de {topicName}." : $"Pratique {subName} em {topicName}."
            : null;
    }

    private static string DefaultStepDescription(string topicName, string? subtopicName) =>
        subtopicName is null ? $"Practice {topicName} questions." : $"Practice {subtopicName} in {topicName}.";

    private async Task SeedIdentityAsync(DateTimeOffset now)
    {
        if (!await roleManager.RoleExistsAsync(Roles.Admin))
            await roleManager.CreateAsync(new IdentityRole<Guid>(Roles.Admin));

        // Optional bootstrap admin from configuration / environment (never committed to the repo).
        var email = configuration["Seed:AdminEmail"];
        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;

        var admin = await userManager.FindByEmailAsync(email);
        if (admin is null)
        {
            admin = new ApplicationUser { Id = Guid.CreateVersion7(), UserName = "admin", Email = email, EmailConfirmed = true };
            var result = await userManager.CreateAsync(admin, password);
            if (!result.Succeeded)
            {
                logger.LogWarning("Admin bootstrap failed: {Errors}", string.Join("; ", result.Errors.Select(e => e.Description)));
                return;
            }
            db.UserProfiles.Add(new User { Id = admin.Id, Username = "admin", DisplayName = "TechRat Admin", Email = email, CreatedAt = now });
            await db.SaveChangesAsync();
        }
        if (!await userManager.IsInRoleAsync(admin, Roles.Admin))
            await userManager.AddToRoleAsync(admin, Roles.Admin);
    }
}
