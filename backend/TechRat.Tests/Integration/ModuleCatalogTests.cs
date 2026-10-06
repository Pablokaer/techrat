using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using TechRat.Application.Common;
using TechRat.Application.Roadmaps;
using TechRat.Domain.Common;
using TechRat.Domain.Roadmaps;
using TechRat.Infrastructure.Persistence;

namespace TechRat.Tests.Integration;

[Collection(ApiCollection.Name)]
public class ModuleCatalogTests(TechRatFactory api)
{
    private sealed record Fixture(string Shared, string Other, string ContextModule, Guid SharedStepId, Guid ContextStepId);

    /// <summary>
    /// Two roadmaps that share a module: <c>shared</c> = [M], <c>other</c> = [M, C]. Built directly in the database so the
    /// test does not depend on catalog content; scopes are real subtopics with enough questions.
    /// </summary>
    private async Task<Fixture> CreateSharedRoadmapsAsync(bool contextOptional = false)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var fixture = await api.WithDbAsync(async db =>
        {
            var scopes = await db.Questions.Where(q => q.IsActive).GroupBy(q => new { q.TopicId, q.SubtopicId })
                .Where(g => g.Count() >= 3).Select(g => g.Key).Take(2).ToListAsync();
            ModuleStep Step(Guid moduleId, int i) => new()
            {
                ModuleId = moduleId, Order = 1, Title = $"Step {i}", Difficulty = Difficulty.Easy, EstimatedMinutes = 30,
                TopicId = scopes[i].TopicId, SubtopicId = scopes[i].SubtopicId, MinimumQuestions = 3, MinimumAccuracy = 70, XPReward = 50,
            };
            // Test fixtures use the "t-" slug prefix (excluded from catalog coverage checks).
            var shared = new LearningModule { Slug = $"t-shared-{suffix}", Name = "Shared", Kind = ModuleKind.Core, XPReward = 150 };
            var context = new LearningModule { Slug = $"t-context-{suffix}", Name = "Context", Kind = ModuleKind.Context, XPReward = 150 };
            shared.Steps.Add(Step(shared.Id, 0));
            context.Steps.Add(Step(context.Id, 1));
            var r1 = new Roadmap { Slug = $"t-one-{suffix}", Name = "One", XPReward = 1000, StepsCount = 1, DisplayOrder = 900 };
            var r2 = new Roadmap { Slug = $"t-two-{suffix}", Name = "Two", XPReward = 1000, StepsCount = contextOptional ? 1 : 2, DisplayOrder = 901 };
            r1.Links.Add(new RoadmapModuleLink { RoadmapId = r1.Id, ModuleId = shared.Id, Order = 1 });
            r2.Links.Add(new RoadmapModuleLink { RoadmapId = r2.Id, ModuleId = shared.Id, Order = 1 });
            r2.Links.Add(new RoadmapModuleLink { RoadmapId = r2.Id, ModuleId = context.Id, Order = 2, IsRequired = !contextOptional });
            db.AddRange(shared, context, r1, r2);
            await db.SaveChangesAsync();
            return new Fixture(r1.Slug, r2.Slug, context.Slug, shared.Steps[0].Id, context.Steps[0].Id);
        });
        using var scope = api.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<ICacheService>().RemoveAsync(CacheKeys.Roadmaps);
        return fixture;
    }

    private static async Task<RoadmapDetailDto> StartAsync(HttpClient client, string slug)
    {
        var res = await client.PostAsync($"/api/v1/roadmaps/{slug}/start", null);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<RoadmapDetailDto>(TechRatFactory.Json))!;
    }

    private async Task<List<CompletedStepDto>> PassStepAsync(HttpClient client, Guid stepId)
    {
        var s = await Practice.StartAsync(client, new { mode = "Roadmap", roadmapStepId = stepId, count = 3 });
        var completed = new List<CompletedStepDto>();
        foreach (var q in s.Questions.Take(3))
            completed.AddRange((await Practice.AnswerAsync(api, client, s, q, true)).CompletedSteps);
        return completed;
    }

    private Task<int> XpCountAsync(string username, XpSourceType source, Guid sourceId) =>
        api.WithDbAsync(async db =>
        {
            var userId = await db.UserProfiles.Where(u => u.Username == username).Select(u => u.Id).SingleAsync();
            return await db.XPTransactions.CountAsync(x => x.UserId == userId && x.SourceType == source && x.SourceId == sourceId);
        });

    [Fact]
    public async Task A_step_earned_in_one_roadmap_counts_in_every_roadmap_and_pays_xp_once()
    {
        var f = await CreateSharedRoadmapsAsync();
        var (client, username) = await api.CreateUserAsync();

        await StartAsync(client, f.Shared);
        var completed = await PassStepAsync(client, f.SharedStepId);
        var step = Assert.Single(completed);
        Assert.Equal(f.SharedStepId, step.StepId);
        Assert.True(step.ModuleCompleted);
        Assert.True(step.RoadmapCompleted); // the first roadmap only contains the shared module

        // The second roadmap already shows the shared module as done, credited from elsewhere.
        var other = await StartAsync(client, f.Other);
        Assert.Equal(1, other.Summary.Progress!.AlreadyCompletedModules);
        Assert.Equal(1, other.Summary.Progress.AlreadyCompletedSteps);
        Assert.Equal(50, other.Summary.Progress.PercentComplete);
        var sharedModule = other.Modules[0];
        Assert.True(sharedModule.IsCompleted);
        Assert.True(sharedModule.CompletedElsewhere);
        Assert.Contains(sharedModule.UsedInRoadmaps, r => r.Slug == f.Shared);
        Assert.Equal(ModuleStatus.Current, other.Modules[1].Status);
        Assert.Equal(StepStatus.Current, other.Modules[1].Steps[0].Status);

        // Finishing the context module completes the second roadmap: its own roadmap bonus, no second step/module XP.
        var second = await PassStepAsync(client, f.ContextStepId);
        Assert.Contains(second, c => c.RoadmapCompleted);
        var sharedModuleId = await api.WithDbAsync(db => db.ModuleSteps.Where(s => s.Id == f.SharedStepId).Select(s => s.ModuleId).SingleAsync());
        Assert.Equal(1, await XpCountAsync(username, XpSourceType.RoadmapStep, f.SharedStepId));
        Assert.Equal(1, await XpCountAsync(username, XpSourceType.RoadmapModule, sharedModuleId));
        var roadmapBonuses = await api.WithDbAsync(async db =>
        {
            var userId = await db.UserProfiles.Where(u => u.Username == username).Select(u => u.Id).SingleAsync();
            return await db.XPTransactions.CountAsync(x => x.UserId == userId && x.Reason == XpReason.RoadmapCompleted);
        });
        Assert.Equal(2, roadmapBonuses);
    }

    [Fact]
    public async Task Completing_sql_foundations_in_Backend_credits_it_in_Data_Analyst_without_paying_xp_twice()
    {
        var (client, username) = await api.CreateUserAsync();
        await StartAsync(client, "backend-developer");

        // Prove every step of the shared module while enrolled in Backend (steps unlock in order).
        var module = await client.GetFromJsonAsync<ModuleDetailDto>("/api/v1/modules/sql-foundations", TechRatFactory.Json);
        foreach (var step in module!.Steps)
        {
            var s = await Practice.StartAsync(client, new { mode = "Roadmap", roadmapStepId = step.Id, count = step.MinimumQuestions });
            foreach (var q in s.Questions.Take(step.MinimumQuestions)) await Practice.AnswerAsync(api, client, s, q, true);
        }
        var done = await client.GetFromJsonAsync<ModuleDetailDto>("/api/v1/modules/sql-foundations", TechRatFactory.Json);
        Assert.True(done!.Summary.Progress!.IsCompleted);

        // Data Analyst shares the module: it is credited immediately when the learner starts the new roadmap.
        var analyst = await StartAsync(client, "data-analyst");
        Assert.True(analyst.Summary.Progress!.AlreadyCompletedModules >= 1);
        Assert.True(analyst.Summary.Progress.AlreadyCompletedSteps >= module.Steps.Count);
        var shared = analyst.Modules.Single(m => m.ModuleSlug == "sql-foundations");
        Assert.True(shared.IsCompleted);
        Assert.True(shared.CompletedElsewhere);
        Assert.Contains(shared.UsedInRoadmaps, r => r.Slug == "backend-developer");

        // Each step and the module paid XP exactly once.
        foreach (var step in module.Steps)
            Assert.Equal(1, await XpCountAsync(username, XpSourceType.RoadmapStep, step.Id));
        Assert.Equal(1, await XpCountAsync(username, XpSourceType.RoadmapModule, module.Summary.Id));
    }

    [Fact]
    public async Task Seed_appends_missing_steps_to_existing_modules_and_bumps_the_version()
    {
        // An existing database whose module lacks a step the seed file now has (e.g. content added in a later release).
        var (moduleId, stepId, version) = await api.WithDbAsync(async db =>
        {
            var step = await db.ModuleSteps.Where(s => db.LearningModules.Any(m => m.Id == s.ModuleId && m.Slug == "git-collaboration"))
                .OrderByDescending(s => s.Order).FirstAsync();
            var v = await db.LearningModules.Where(m => m.Id == step.ModuleId).Select(m => m.Version).SingleAsync();
            await db.ModuleSteps.Where(s => s.Id == step.Id).ExecuteDeleteAsync();
            return (step.ModuleId, step.Id, v);
        });

        using var scope = api.Services.CreateScope();
        var report = await scope.ServiceProvider.GetRequiredService<TechRat.Infrastructure.Seed.DatabaseSeeder>().SeedAsync();

        Assert.Equal(1, report.StepsAdded);
        var (steps, newVersion, added) = await api.WithDbAsync(async db => (
            await db.ModuleSteps.CountAsync(s => s.ModuleId == moduleId && s.IsActive),
            await db.LearningModules.Where(m => m.Id == moduleId).Select(m => m.Version).SingleAsync(),
            await db.ModuleSteps.Where(s => s.ModuleId == moduleId).MaxAsync(s => s.AddedInVersion)));
        Assert.Equal(version + 1, newVersion);
        Assert.Equal(newVersion, added);
        Assert.True(steps >= 2);
    }

    [Fact]
    public async Task Optional_modules_never_block_completion()
    {
        var f = await CreateSharedRoadmapsAsync(contextOptional: true);
        var (client, _) = await api.CreateUserAsync();
        var detail = await StartAsync(client, f.Other);
        Assert.False(detail.Modules[1].IsRequired);
        Assert.Equal(StepStatus.Current, detail.Modules[1].Steps[0].Status); // optional modules are open from the start

        var completed = await PassStepAsync(client, f.SharedStepId);
        Assert.Contains(completed, c => c.RoadmapCompleted);
        var after = await client.GetFromJsonAsync<RoadmapDetailDto>($"/api/v1/roadmaps/{f.Other}", TechRatFactory.Json);
        Assert.Equal(100, after!.Summary.Progress!.PercentComplete);
        Assert.True(after.Summary.Progress.IsCompleted);
    }

    [Fact]
    public async Task Roadmap_cards_report_modules_already_completed_elsewhere()
    {
        var f = await CreateSharedRoadmapsAsync();
        var (client, _) = await api.CreateUserAsync();
        await StartAsync(client, f.Shared);
        await PassStepAsync(client, f.SharedStepId);

        var list = await client.GetFromJsonAsync<List<RoadmapSummaryDto>>("/api/v1/roadmaps", TechRatFactory.Json);
        var card = list!.Single(r => r.Slug == f.Other);
        Assert.False(card.Progress!.IsStarted);
        Assert.Equal(1, card.Progress.AlreadyCompletedModules);
        Assert.Equal(2, card.ModulesCount);
    }

    [Fact]
    public async Task Data_migration_maps_old_roadmap_modules_and_completions_without_losing_progress()
    {
        var dbName = $"techrat_migration_{Guid.NewGuid():N}";
        await using (var conn = new NpgsqlConnection(api.ConnectionString))
        {
            await conn.OpenAsync();
            await new NpgsqlCommand($"CREATE DATABASE {dbName}", conn).ExecuteNonQueryAsync();
        }
        var cs = new NpgsqlConnectionStringBuilder(api.ConnectionString) { Database = dbName }.ConnectionString;
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(cs, o => o.MigrationsHistoryTable("__ef_migrations_history", "infrastructure")).UseSnakeCaseNamingConvention().Options;
        await using var db = new AppDbContext(options);
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("20261006002333_AddQuestionTranslations");

        Guid topic = Guid.NewGuid(), sub1 = Guid.NewGuid(), sub2 = Guid.NewGuid(), roadmap = Guid.NewGuid(), user = Guid.NewGuid();
        Guid modA = Guid.NewGuid(), modB = Guid.NewGuid(), s1 = Guid.NewGuid(), s2 = Guid.NewGuid(), s3 = Guid.NewGuid();
        // Test data only: every interpolated value is a Guid generated above.
#pragma warning disable EF1002
        await db.Database.ExecuteSqlRawAsync($"""
            INSERT INTO content.topics (id, slug, name, description, category, icon, display_order, is_active)
            VALUES ('{topic}', 'git', 'Git', '', 'Tools', 'git', 1, true);
            INSERT INTO content.subtopics (id, topic_id, slug, name, display_order) VALUES
              ('{sub1}', '{topic}', 'basics', 'Basics', 1), ('{sub2}', '{topic}', 'branching', 'Branching', 2);
            INSERT INTO roadmaps.roadmaps (id, slug, name, description, category, difficulty, estimated_hours, steps_count, icon, is_published, display_order, xp_reward)
            VALUES ('{roadmap}', 'git-and-collaboration', 'Git', '', 'Tools', 'Beginner', 2, 3, 'git', true, 1, 1000);
            INSERT INTO roadmaps.roadmap_modules (id, roadmap_id, title, "order", xp_reward) VALUES
              ('{modA}', '{roadmap}', 'Git Essentials', 1, 150), ('{modB}', '{roadmap}', 'Collaboration', 2, 150);
            INSERT INTO roadmaps.roadmap_steps (id, roadmap_id, module_id, title, description, "order", difficulty, estimated_minutes, topic_id, subtopic_id, minimum_questions, minimum_accuracy, xp_reward) VALUES
              ('{s1}', '{roadmap}', '{modA}', 'Basics', '', 1, 'Easy', 30, '{topic}', '{sub1}', 5, 70, 50),
              ('{s2}', '{roadmap}', '{modA}', 'Branching', '', 2, 'Easy', 30, '{topic}', '{sub2}', 5, 70, 50),
              ('{s3}', '{roadmap}', '{modB}', 'Whole topic', '', 3, 'Easy', 30, '{topic}', NULL, 5, 70, 50);
            INSERT INTO identity.users (id, user_name, email, email_confirmed, phone_number_confirmed, two_factor_enabled, lockout_enabled, access_failed_count)
            VALUES ('{user}', 'legacy', 'legacy@example.com', true, false, false, false, 0);
            INSERT INTO learning.users (id, username, display_name, email, created_at, current_global_level, current_global_xp, current_streak, longest_streak, questions_answered, correct_answers, global_accuracy, global_rank)
            VALUES ('{user}', 'legacy', 'Legacy', 'legacy@example.com', now(), 1, 0, 0, 0, 0, 0, 0, 0);
            INSERT INTO roadmaps.user_roadmap_progress (id, user_id, roadmap_id, completed_steps, current_step_id, started_at, last_activity_at)
            VALUES ('{Guid.NewGuid()}', '{user}', '{roadmap}', 2, '{s3}', now(), now());
            INSERT INTO roadmaps.user_roadmap_step_completions (user_id, roadmap_step_id, roadmap_id, completed_at) VALUES
              ('{user}', '{s1}', '{roadmap}', now()), ('{user}', '{s2}', '{roadmap}', now());
            INSERT INTO content.content_translations (entity_type, entity_id, locale, field, value) VALUES
              ('roadmap-module', '{modA}', 'pt-BR', 'title', 'Fundamentos de Git'),
              ('roadmap-step', '{s1}', 'pt-BR', 'title', 'Fundamentos');
            """);
#pragma warning restore EF1002

        await migrator.MigrateAsync();

        var modules = await db.LearningModules.Include(m => m.Steps).OrderBy(m => m.DisplayOrder).ToListAsync();
        Assert.Equal([modA, modB], modules.Select(m => m.Id));
        Assert.Equal("legacy-git-and-collaboration-1", modules[0].Slug);
        Assert.Equal([1, 2], modules[0].Steps.OrderBy(s => s.Order).Select(s => s.Order));
        Assert.Equal([s1, s2], modules[0].Steps.OrderBy(s => s.Order).Select(s => s.Id));
        Assert.Null(modules[1].Steps.Single().SubtopicId);

        var links = await db.RoadmapModuleLinks.Where(l => l.RoadmapId == roadmap).OrderBy(l => l.Order).ToListAsync();
        Assert.Equal([modA, modB], links.Select(l => l.ModuleId));
        Assert.All(links, l => Assert.True(l.IsRequired));

        var completions = await db.UserModuleStepCompletions.Where(c => c.UserId == user).OrderBy(c => c.CompletedAt).ToListAsync();
        Assert.Equal(new HashSet<Guid> { s1, s2 }, completions.Select(c => c.ModuleStepId).ToHashSet());
        Assert.All(completions, c => Assert.True(c.XpAwarded));

        var moduleProgress = await db.UserModuleProgress.SingleAsync(p => p.UserId == user);
        Assert.Equal(modA, moduleProgress.ModuleId);
        Assert.NotNull(moduleProgress.CompletedAt); // both steps of module A were done
        Assert.Equal(2, moduleProgress.CompletedSteps);

        var roadmapProgress = await db.UserRoadmapProgress.SingleAsync(p => p.UserId == user);
        Assert.Equal(2, roadmapProgress.CompletedSteps);
        Assert.Equal(s3, roadmapProgress.CurrentStepId);

        var translations = await db.ContentTranslations.Where(t => t.EntityId == modA || t.EntityId == s1).ToListAsync();
        Assert.Contains(translations, t => t.EntityType == "module" && t.Field == "name" && t.Value == "Fundamentos de Git");
        Assert.Contains(translations, t => t.EntityType == "module-step" && t.Field == "title");

        // Migrating an empty database is a no-op for data.
        await db.Database.EnsureDeletedAsync();
        await migrator.MigrateAsync();
        Assert.Equal(0, await db.LearningModules.CountAsync());
        await db.Database.EnsureDeletedAsync();
    }
}
