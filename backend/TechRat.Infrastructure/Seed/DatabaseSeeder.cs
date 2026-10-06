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
    int TopicsAdded, int SubtopicsAdded, int QuestionsAdded, int RoadmapsAdded, int StepsAdded, int AchievementsAdded, int TranslationsAdded,
    int QuestionsUpdated = 0, int TranslationsUpdated = 0, int ModulesAdded = 0, int CompositionsChanged = 0, int CreditsMapped = 0);

/// <summary>
/// Idempotent seed. Records are matched by natural keys (slug / external key / code) and only missing ones are inserted,
/// so restarts never duplicate data and admin edits to existing records are preserved.
/// </summary>
public sealed partial class DatabaseSeeder(
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
    private sealed record AchievementJson(string Code, string Name, string Description, string RuleType, int Threshold, string? TargetSlug,
        int? SecondaryThreshold, string Tier, string Icon, int XpReward, string Category);

    // i18n/<locale>.json: catalog translations keyed by slug / code / order.
    private sealed record TranslationJson(
        Dictionary<string, TopicTranslationJson>? Topics, Dictionary<string, RoadmapTranslationJson>? Roadmaps,
        Dictionary<string, AchievementTranslationJson>? Achievements, Dictionary<string, ModuleTranslationJson>? Modules);
    private sealed record TopicTranslationJson(string? Name, string? Description, string? Category, Dictionary<string, string>? Subtopics);
    private sealed record RoadmapTranslationJson(string? Name, string? Description, string? Category);
    /// <summary>Module name/description and step titles keyed by "topic/subtopic" (or "topic" for whole-topic steps).</summary>
    private sealed record ModuleTranslationJson(string? Name, string? Description, Dictionary<string, string>? Steps);
    private sealed record AchievementTranslationJson(string? Name, string? Description, string? Category);
    private const string TranslationResourcePrefix = ".Seed.Data.i18n.";
    private const string QuestionTranslationResourcePrefix = ".Seed.Data.i18n.questions.";
    private sealed record QuestionTranslationJson(string Id, string Title, string Question, List<string> Options, string Explanation);

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
                // Add through the DbSet: a client-generated key reached only via navigation is treated as an existing row (UPDATE).
                var subtopic = new Subtopic { Slug = sj.Slug, Name = sj.Name, DisplayOrder = sj.Order, TopicId = topic.Id };
                db.Subtopics.Add(subtopic);
                topic.Subtopics.Add(subtopic);
                subsAdded++;
            }
        }
        await db.SaveChangesAsync(ct);

        // Questions ------------------------------------------------------------
        // Seeded questions an admin never edited (UpdatedAt == CreatedAt) follow the seed files, so content fixes
        // (e.g. rebalanced option lengths) reach existing databases. Admin-edited questions are left alone.
        var seeded = await db.Questions.Include(q => q.Options).Where(q => q.ExternalKey != null).ToDictionaryAsync(q => q.ExternalKey!, ct);
        var existingKeys = seeded.Keys.ToHashSet();
        var questionsAdded = 0;
        var questionsUpdated = 0;
        foreach (var file in LoadQuestionFiles())
        foreach (var qj in file.Where(q => seeded.ContainsKey(q.Id)))
            if (RefreshFromSeed(seeded[qj.Id], qj)) questionsUpdated++;
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

        // Module catalog and roadmaps --------------------------------------------
        var catalog = await SeedCatalogAsync(topics, ct);

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

        var translations = new TranslationWriter(db);
        await SeedTranslationsAsync(topics, translations, ct);
        await SeedQuestionTranslationsAsync(translations, ct);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await SeedIdentityAsync(now);

        var report = new SeedReport(topicsAdded, subsAdded, questionsAdded, catalog.RoadmapsAdded, catalog.StepsAdded, achievementsAdded,
            translations.Added, questionsUpdated, translations.Updated, catalog.ModulesAdded, catalog.CompositionsChanged, catalog.CreditsMapped);
        logger.LogInformation("Seed completed {@SeedReport}", report);
        return report;
    }

    /// <summary>
    /// Writes catalog translations from every <c>Seed/Data/i18n/&lt;locale&gt;.json</c> (see <see cref="TranslationWriter"/>).
    /// </summary>
    private async Task SeedTranslationsAsync(List<Topic> topics, TranslationWriter writer, CancellationToken ct)
    {
        var asm = typeof(DatabaseSeeder).Assembly;
        var roadmaps = await db.Roadmaps.ToListAsync(ct);
        var modules = await db.LearningModules.Include(m => m.Steps).ToListAsync(ct);
        var achievements = await db.Achievements.ToListAsync(ct);

        foreach (var resource in asm.GetManifestResourceNames()
                     .Where(n => n.Contains(TranslationResourcePrefix, StringComparison.Ordinal) && !n.Contains(QuestionTranslationResourcePrefix, StringComparison.Ordinal))
                     .Order())
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

            await writer.LoadAsync(locale, ct);
            void Add(string entityType, Guid id, string field, string? value) => writer.Write(locale, entityType, id, field, value);

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
            }

            foreach (var module in modules)
            {
                var mt = data.Modules?.GetValueOrDefault(module.Slug);
                if (mt is not null)
                {
                    Add(TranslatableEntity.Module, module.Id, TranslatableField.Name, mt.Name);
                    Add(TranslatableEntity.Module, module.Id, TranslatableField.Description, mt.Description);
                }
                foreach (var step in module.Steps)
                {
                    var topic = topics.First(t => t.Id == step.TopicId);
                    var sub = step.SubtopicId is { } sid ? topic.Subtopics.First(x => x.Id == sid) : null;
                    var key = sub is null ? topic.Slug : $"{topic.Slug}/{sub.Slug}";
                    if (mt?.Steps?.TryGetValue(key, out var title) == true)
                        Add(TranslatableEntity.ModuleStep, step.Id, TranslatableField.Title, title);
                    Add(TranslatableEntity.ModuleStep, step.Id, TranslatableField.Description, StepDescription(step, topics, topicTr, locale));
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

    }

    /// <summary>Writes question translations from <c>Seed/Data/i18n/questions/&lt;group&gt;.&lt;locale&gt;.json</c>, matched by question id.</summary>
    private async Task SeedQuestionTranslationsAsync(TranslationWriter writer, CancellationToken ct)
    {
        var asm = typeof(DatabaseSeeder).Assembly;
        var questions = await db.Questions.AsNoTracking().Where(q => q.ExternalKey != null)
            .Select(q => new { q.Id, Key = q.ExternalKey!, Options = q.Options.OrderBy(o => o.DisplayOrder).Select(o => o.Id).ToList() })
            .ToDictionaryAsync(q => q.Key, ct);

        foreach (var resource in asm.GetManifestResourceNames().Where(n => n.Contains(QuestionTranslationResourcePrefix, StringComparison.Ordinal)).Order())
        {
            var file = Path.GetFileNameWithoutExtension(resource); // "...questions.<group>.<locale>"
            var locale = file[(file.LastIndexOf('.') + 1)..];
            if (locale == AppLocales.Default || !AppLocales.Supported.Contains(locale))
            {
                logger.LogWarning("Skipping question translation file {File}: {Locale} is not a supported non-default locale", resource, locale);
                continue;
            }

            List<QuestionTranslationJson> data;
            await using (var stream = asm.GetManifestResourceStream(resource)!)
                data = (await JsonSerializer.DeserializeAsync<List<QuestionTranslationJson>>(stream, Json, ct))!;

            await writer.LoadAsync(locale, ct);
            foreach (var t in data)
            {
                if (!questions.TryGetValue(t.Id, out var q)) continue;
                writer.Write(locale, TranslatableEntity.Question, q.Id, TranslatableField.Title, t.Title);
                writer.Write(locale, TranslatableEntity.Question, q.Id, TranslatableField.Text, t.Question);
                writer.Write(locale, TranslatableEntity.Question, q.Id, TranslatableField.Explanation, t.Explanation);
                if (t.Options.Count != q.Options.Count)
                {
                    logger.LogWarning("Question translation {Id} has {Count} options; expected {Expected}", t.Id, t.Options.Count, q.Options.Count);
                    continue;
                }
                for (var i = 0; i < q.Options.Count; i++)
                    writer.Write(locale, TranslatableEntity.QuestionOption, q.Options[i], TranslatableField.Text, t.Options[i]);
            }
        }
    }

    /// <summary>
    /// Copies the seed file's text into an unedited seeded question. Returns true when something changed.
    /// The option order and the correct option never change (attempts reference option ids), so a seed entry
    /// that moves the correct answer is ignored with a warning.
    /// </summary>
    private bool RefreshFromSeed(Question q, QuestionJson qj)
    {
        if (q.UpdatedAt != q.CreatedAt) return false;
        var options = q.Options.OrderBy(o => o.DisplayOrder).ToList();
        if (options.Count != qj.Options.Count || options.FindIndex(o => o.IsCorrect) != qj.CorrectIndex)
        {
            logger.LogWarning("Seed question {Id} changed its options or correct answer; refresh skipped", qj.Id);
            return false;
        }

        var changed = false;
        void Set(string current, string value, Action<string> apply)
        {
            if (current == value) return;
            apply(value);
            changed = true;
        }
        Set(q.Title, qj.Title, v => q.Title = v);
        Set(q.QuestionText, qj.Question, v => q.QuestionText = v);
        Set(q.Explanation, qj.Explanation, v => q.Explanation = v);
        Set(q.ReferenceUrl, qj.ReferenceUrl, v => q.ReferenceUrl = v);
        for (var i = 0; i < options.Count; i++)
        {
            var option = options[i];
            Set(option.Text, qj.Options[i], v => option.Text = v);
        }
        return changed;
    }

    /// <summary>
    /// Inserts missing translation rows and refreshes rows that still mirror the seed (<see cref="ContentTranslation.SeedManaged"/>).
    /// Rows customised by an admin are never overwritten.
    /// </summary>
    private sealed class TranslationWriter(AppDbContext db)
    {
        private readonly Dictionary<(string Locale, string Type, Guid Id, string Field), ContentTranslation> _rows = [];
        private readonly HashSet<string> _loadedLocales = [];

        public int Added { get; private set; }
        public int Updated { get; private set; }

        public async Task LoadAsync(string locale, CancellationToken ct)
        {
            if (!_loadedLocales.Add(locale)) return;
            foreach (var row in await db.ContentTranslations.Where(t => t.Locale == locale).ToListAsync(ct))
                _rows[(row.Locale, row.EntityType, row.EntityId, row.Field)] = row;
        }

        public void Write(string locale, string entityType, Guid id, string field, string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return;
            value = value.Trim();
            if (_rows.TryGetValue((locale, entityType, id, field), out var row))
            {
                if (!row.SeedManaged || row.Value == value) return;
                row.Value = value;
                Updated++;
                return;
            }
            row = new ContentTranslation { EntityType = entityType, EntityId = id, Locale = locale, Field = field, Value = value };
            db.ContentTranslations.Add(row);
            _rows[(locale, entityType, id, field)] = row;
            Added++;
        }
    }

    /// <summary>The generated step description in <paramref name="locale"/>; null when an admin replaced the generated English text.</summary>
    private static string? StepDescription(ModuleStep step, List<Topic> topics, Dictionary<string, TopicTranslationJson> topicTr, string locale)
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
