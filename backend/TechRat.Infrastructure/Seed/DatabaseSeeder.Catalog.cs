using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Application.Roadmaps;
using TechRat.Domain.Common;
using TechRat.Domain.Content;
using TechRat.Domain.Roadmaps;

namespace TechRat.Infrastructure.Seed;

/// <summary>
/// Module catalog and roadmap composition (ADR-0012). Seed-managed modules and compositions follow modules.json and
/// roadmaps.json; anything an admin edited is left alone. Completions are never deleted.
/// </summary>
public sealed partial class DatabaseSeeder
{
    private sealed record ModuleJson(string Slug, string Name, string Description, string Kind, string Category, string Level, string Icon,
        bool Standalone, List<string> Requires, List<ModuleStepJson> Steps);
    private sealed record ModuleStepJson(string Topic, string? Subtopic, string Title, string? Difficulty);
    private sealed record RoadmapJson(string Slug, string Name, string Category, string Difficulty, string Icon, string Description,
        int EstimatedHours, List<PrereqJson> Prerequisites, List<RoadmapModuleRefJson> Modules, int? JuniorRank = null);
    private sealed record RoadmapModuleRefJson(string Slug, bool Required = true);
    private sealed record PrereqJson(string Slug, int MinimumPercent);

    private sealed record CatalogReport(int ModulesAdded, int StepsAdded, int RoadmapsAdded, int CompositionsChanged, int CreditsMapped);

    private static int StepMinutes(RoadmapDifficulty level) => level switch
    {
        RoadmapDifficulty.Beginner => 30, RoadmapDifficulty.Intermediate => 45, RoadmapDifficulty.Advanced => 60, _ => 75,
    };

    private async Task<CatalogReport> SeedCatalogAsync(List<Topic> topics, CancellationToken ct)
    {
        var (modulesAdded, stepsAdded) = await SeedModulesAsync(topics, ct);
        var (roadmapsAdded, compositions) = await SeedRoadmapsAsync(ct);
        var credits = await CreditByScopeAsync(ct);
        await RecomputeProgressAsync(ct);
        return new CatalogReport(modulesAdded, stepsAdded, roadmapsAdded, compositions, credits);
    }

    private async Task<(int Modules, int Steps)> SeedModulesAsync(List<Topic> topics, CancellationToken ct)
    {
        var questionCounts = await db.Questions.Where(q => q.IsActive)
            .GroupBy(q => new { q.TopicId, q.SubtopicId }).Select(g => new { g.Key.TopicId, g.Key.SubtopicId, Count = g.Count() }).ToListAsync(ct);
        int Available(Guid topicId, Guid? subId) => questionCounts.Where(c => c.TopicId == topicId && (subId == null || c.SubtopicId == subId)).Sum(c => c.Count);

        var json = Load<List<ModuleJson>>("modules.json");
        var modules = await db.LearningModules.Include(m => m.Steps).Include(m => m.Dependencies).ToListAsync(ct);
        int modulesAdded = 0, stepsAdded = 0;

        for (var i = 0; i < json.Count; i++)
        {
            var mj = json[i];
            var level = Enum.Parse<RoadmapDifficulty>(mj.Level);
            var module = modules.FirstOrDefault(m => m.Slug == mj.Slug);
            var created = module is null;
            if (module is null)
            {
                module = new LearningModule { Slug = mj.Slug, Name = mj.Name, XPReward = _o.RoadmapModuleXp };
                db.LearningModules.Add(module);
                modules.Add(module);
                modulesAdded++;
            }
            else if (!module.SeedManaged) continue;

            (module.Name, module.Description, module.Kind, module.Category, module.Level, module.Icon, module.IsStandalone, module.IsPublished, module.DisplayOrder) =
                (mj.Name, mj.Description, Enum.Parse<ModuleKind>(mj.Kind), mj.Category, level, mj.Icon, mj.Standalone, true, i + 1);

            var wanted = new List<ModuleStep>();
            var added = new List<ModuleStep>();
            for (var order = 0; order < mj.Steps.Count; order++)
            {
                var sj = mj.Steps[order];
                var topic = topics.First(t => t.Slug == sj.Topic);
                var sub = sj.Subtopic is null ? null : topic.Subtopics.First(s => s.Slug == sj.Subtopic);
                var available = Available(topic.Id, sub?.Id);
                if (available == 0) throw new InvalidOperationException($"Module {mj.Slug} step {sj.Title} has no questions.");
                var step = module.Steps.FirstOrDefault(s => s.TopicId == topic.Id && s.SubtopicId == sub?.Id);
                if (step is null)
                {
                    step = new ModuleStep
                    {
                        ModuleId = module.Id, Title = sj.Title, TopicId = topic.Id, SubtopicId = sub?.Id,
                        MinimumAccuracy = _o.DefaultStepMinimumAccuracy, XPReward = _o.RoadmapStepXp,
                    };
                    // Through the DbSet, so a step appended to an existing module is inserted (not treated as an existing row).
                    db.ModuleSteps.Add(step);
                    module.Steps.Add(step);
                    added.Add(step);
                    stepsAdded++;
                }
                step.Order = order + 1;
                step.Title = sj.Title;
                step.Description = DefaultStepDescription(topic.Name, sub?.Name);
                step.Difficulty = sj.Difficulty is null ? DifficultyRamp.StepDifficulty(level, order, mj.Steps.Count) : Enum.Parse<Difficulty>(sj.Difficulty);
                step.EstimatedMinutes = StepMinutes(level);
                // Never require more questions than exist in the step's scope.
                step.MinimumQuestions = Math.Min(_o.DefaultStepMinimumQuestions, available);
                step.IsActive = true;
                wanted.Add(step);
            }
            // Steps dropped from the seed are deactivated (completions stay); new steps bump the version.
            foreach (var stale in module.Steps.Except(wanted).Where(s => s.IsActive)) stale.IsActive = false;
            if (!created && added.Count > 0) module.Version++;
            foreach (var s in added) s.AddedInVersion = module.Version;
            module.EstimatedMinutes = wanted.Sum(s => s.EstimatedMinutes);
        }
        await db.SaveChangesAsync(ct);

        foreach (var mj in json)
        {
            var module = modules.First(m => m.Slug == mj.Slug);
            foreach (var requiredSlug in mj.Requires)
            {
                var required = modules.First(m => m.Slug == requiredSlug);
                if (module.Dependencies.Any(d => d.RequiredModuleId == required.Id)) continue;
                module.Dependencies.Add(new ModuleDependency { ModuleId = module.Id, RequiredModuleId = required.Id });
            }
        }
        await db.SaveChangesAsync(ct);
        return (modulesAdded, stepsAdded);
    }

    private async Task<(int Added, int CompositionsChanged)> SeedRoadmapsAsync(CancellationToken ct)
    {
        var json = Load<List<RoadmapJson>>("roadmaps.json");
        var roadmaps = await db.Roadmaps.Include(r => r.Links).ToListAsync(ct);
        var modules = await db.LearningModules.ToDictionaryAsync(m => m.Slug, ct);
        int added = 0, changed = 0, order = roadmaps.Count;

        foreach (var rj in json)
        {
            var roadmap = roadmaps.FirstOrDefault(r => r.Slug == rj.Slug);
            if (roadmap is null)
            {
                roadmap = new Roadmap
                {
                    Slug = rj.Slug, Name = rj.Name, Category = rj.Category, Difficulty = Enum.Parse<RoadmapDifficulty>(rj.Difficulty), Icon = rj.Icon,
                    Description = rj.Description, EstimatedHours = rj.EstimatedHours, IsPublished = true, DisplayOrder = ++order, XPReward = _o.RoadmapCompletedXp,
                };
                db.Roadmaps.Add(roadmap);
                roadmaps.Add(roadmap);
                added++;
            }
            // The junior recommendation is curated in the seed only, so it follows the file even after admin edits.
            roadmap.JuniorRank = rj.JuniorRank;
            if (!roadmap.CompositionSeedManaged) continue;

            var wanted = rj.Modules.Select((m, i) => (ModuleId: modules[m.Slug].Id, Order: i + 1, m.Required)).ToList();
            var current = roadmap.Links.OrderBy(l => l.Order).Select(l => (l.ModuleId, l.Order, Required: l.IsRequired)).ToList();
            roadmap.EstimatedHours = rj.EstimatedHours;
            if (current.SequenceEqual(wanted)) continue;

            // Delete first, then insert, so the unique (roadmap, order) index never sees two links at the same position.
            db.RoadmapModuleLinks.RemoveRange(roadmap.Links);
            await db.SaveChangesAsync(ct);
            roadmap.Links.Clear();
            foreach (var w in wanted)
                roadmap.Links.Add(new RoadmapModuleLink { RoadmapId = roadmap.Id, ModuleId = w.ModuleId, Order = w.Order, IsRequired = w.Required });
            changed++;
        }
        await db.SaveChangesAsync(ct);

        var deps = await db.RoadmapDependencies.ToListAsync(ct);
        foreach (var rj in json)
        {
            var roadmap = roadmaps.First(r => r.Slug == rj.Slug);
            foreach (var p in rj.Prerequisites)
            {
                var required = roadmaps.First(r => r.Slug == p.Slug);
                if (deps.Any(d => d.RoadmapId == roadmap.Id && d.RequiredRoadmapId == required.Id)) continue;
                var dep = new RoadmapDependency { RoadmapId = roadmap.Id, RequiredRoadmapId = required.Id, MinimumPercent = p.MinimumPercent };
                db.RoadmapDependencies.Add(dep);
                deps.Add(dep);
            }
        }

        // Seed-managed modules that are neither in the catalog file nor linked anywhere (e.g. migrated legacy modules) are hidden.
        var catalogSlugs = Load<List<ModuleJson>>("modules.json").Select(m => m.Slug).ToHashSet();
        var linked = await db.RoadmapModuleLinks.Select(l => l.ModuleId).Distinct().ToListAsync(ct);
        foreach (var orphan in modules.Values.Where(m => m.SeedManaged && m.IsPublished && !m.IsStandalone && !catalogSlugs.Contains(m.Slug)
                     && !linked.Contains(m.Id) && !db.RoadmapModuleLinks.Local.Any(l => l.ModuleId == m.Id)))
            orphan.IsPublished = false;
        await db.SaveChangesAsync(ct);
        return (added, changed);
    }

    /// <summary>
    /// Credit mapping by scope: a completion on a step of an unpublished module (e.g. a migrated legacy roadmap module)
    /// also completes the published catalog step with the same topic/subtopic. No XP is paid for these credits
    /// (<c>xp_awarded = false</c>): it was paid when the original step was completed.
    /// </summary>
    private Task<int> CreditByScopeAsync(CancellationToken ct) => db.Database.ExecuteSqlRawAsync(CatalogSql.CreditByScope, ct);

    /// <summary>Rebuilds module progress counters/completion and roadmap counters from completions (idempotent).</summary>
    private async Task RecomputeProgressAsync(CancellationToken ct)
    {
        await db.Database.ExecuteSqlRawAsync(CatalogSql.RecomputeModuleProgress, ct);
        await db.Database.ExecuteSqlRawAsync(CatalogSql.RecomputeRoadmapCounters, ct);
    }
}

/// <summary>SQL shared by the seeder (the EF migration keeps its own frozen copy).</summary>
internal static class CatalogSql
{
    public const string CreditByScope = """
        INSERT INTO roadmaps.user_module_step_completions (user_id, module_step_id, module_id, completed_at, xp_awarded)
        SELECT DISTINCT ON (c.user_id, t.id) c.user_id, t.id, t.module_id, c.completed_at, false
        FROM roadmaps.user_module_step_completions c
        JOIN roadmaps.module_steps s ON s.id = c.module_step_id
        JOIN roadmaps.modules sm ON sm.id = s.module_id AND NOT sm.is_published
        JOIN roadmaps.module_steps t ON t.topic_id = s.topic_id AND t.subtopic_id IS NOT DISTINCT FROM s.subtopic_id AND t.is_active
        JOIN roadmaps.modules tm ON tm.id = t.module_id AND tm.is_published
        ORDER BY c.user_id, t.id, c.completed_at
        ON CONFLICT DO NOTHING;
        """;

    public const string RecomputeModuleProgress = """
        INSERT INTO roadmaps.user_module_progress (id, user_id, module_id, completed_steps, started_at)
        SELECT gen_random_uuid(), c.user_id, c.module_id, 0, min(c.completed_at)
        FROM roadmaps.user_module_step_completions c
        WHERE NOT EXISTS (SELECT 1 FROM roadmaps.user_module_progress p WHERE p.user_id = c.user_id AND p.module_id = c.module_id)
        GROUP BY c.user_id, c.module_id;

        UPDATE roadmaps.user_module_progress p
        SET completed_steps = x.done
        FROM (SELECT c.user_id, c.module_id, count(*) AS done
              FROM roadmaps.user_module_step_completions c
              JOIN roadmaps.module_steps s ON s.id = c.module_step_id AND s.is_active
              GROUP BY c.user_id, c.module_id) x
        WHERE p.user_id = x.user_id AND p.module_id = x.module_id AND p.completed_steps <> x.done;

        UPDATE roadmaps.user_module_progress p
        SET completed_at = now(), completed_version = m.version
        FROM roadmaps.modules m
        WHERE m.id = p.module_id AND p.completed_at IS NULL
          AND p.completed_steps >= (SELECT count(*) FROM roadmaps.module_steps s WHERE s.module_id = m.id AND s.is_active)
          AND EXISTS (SELECT 1 FROM roadmaps.module_steps s WHERE s.module_id = m.id AND s.is_active);
        """;

    public const string RecomputeRoadmapCounters = """
        UPDATE roadmaps.roadmaps r
        SET steps_count = x.total
        FROM (SELECT r2.id, COALESCE(sum(st.total), 0) AS total
              FROM roadmaps.roadmaps r2
              LEFT JOIN roadmaps.roadmap_module_links l ON l.roadmap_id = r2.id AND l.is_required
              LEFT JOIN (SELECT module_id, count(*) AS total FROM roadmaps.module_steps WHERE is_active GROUP BY module_id) st ON st.module_id = l.module_id
              GROUP BY r2.id) x
        WHERE r.id = x.id AND r.steps_count <> x.total;

        UPDATE roadmaps.user_roadmap_progress rp
        SET completed_steps = x.done
        FROM (SELECT rp2.id,
                     COALESCE(sum(CASE WHEN ump.completed_at IS NOT NULL THEN st.total ELSE LEAST(st.total, COALESCE(dc.done, 0)) END), 0) AS done
              FROM roadmaps.user_roadmap_progress rp2
              JOIN roadmaps.roadmap_module_links l ON l.roadmap_id = rp2.roadmap_id AND l.is_required
              JOIN (SELECT module_id, count(*) AS total FROM roadmaps.module_steps WHERE is_active GROUP BY module_id) st ON st.module_id = l.module_id
              LEFT JOIN roadmaps.user_module_progress ump ON ump.user_id = rp2.user_id AND ump.module_id = l.module_id
              LEFT JOIN (SELECT c.user_id, c.module_id, count(*) AS done
                         FROM roadmaps.user_module_step_completions c
                         JOIN roadmaps.module_steps s ON s.id = c.module_step_id AND s.is_active
                         GROUP BY c.user_id, c.module_id) dc ON dc.user_id = rp2.user_id AND dc.module_id = l.module_id
              GROUP BY rp2.id) x
        WHERE rp.id = x.id AND rp.completed_steps <> x.done;
        """;
}
