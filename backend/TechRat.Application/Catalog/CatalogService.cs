using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Application.Gamification;
using TechRat.Domain.Common;

namespace TechRat.Application.Catalog;

public sealed record DifficultyCountsDto(int Easy, int Medium, int Hard, int Expert)
{
    public int Total => Easy + Medium + Hard + Expert;
}

public sealed record SubtopicDto(Guid Id, string Slug, string Name, int Order, int QuestionCount);

public sealed record TopicDto(
    Guid Id, string Slug, string Name, string Description, string Category, string Icon, int Order,
    DifficultyCountsDto Questions, IReadOnlyList<SubtopicDto> Subtopics);

public sealed record TopicProgressDto(
    string TopicSlug, string TopicName, string Icon, string Category, LevelDto Level, int QuestionsAnswered, int CorrectAnswers,
    double Accuracy, int TotalQuestions, int DistinctAnswered, double CompletionPercent, DateTimeOffset? LastActivityAt);

public sealed record SubtopicProgressDto(string Slug, string Name, int QuestionCount, int Answered, int Correct, double Accuracy);

public sealed record DifficultyBreakdownDto(string Difficulty, int Answered, int Correct, double Accuracy);

public sealed record TopicDetailDto(TopicDto Topic, TopicProgressDto? Progress, IReadOnlyList<SubtopicProgressDto> SubtopicProgress, IReadOnlyList<DifficultyBreakdownDto> ByDifficulty);

public sealed record SearchResultDto(string Type, string Slug, string Title, string Subtitle, string Icon, string Url);

public sealed class CatalogService(IAppDbContext db, ICacheService cache, ContentLocalizer localizer, LevelService levels)
{
    /// <summary>Active topics with names, descriptions and categories in the request language.</summary>
    public async Task<List<TopicDto>> ListTopicsAsync(CancellationToken ct)
    {
        var topics = await BaseTopicsAsync(ct);
        var tr = await localizer.LoadAsync(ct);
        return ReferenceEquals(tr, ContentTranslations.None) ? topics : topics.Select(t => Localize(t, tr)).ToList();
    }

    private static TopicDto Localize(TopicDto t, ContentTranslations tr) => t with
    {
        Name = tr.TopicName(t.Id, t.Name),
        Description = tr.TopicDescription(t.Id, t.Description),
        Category = tr.TopicCategory(t.Id, t.Category),
        Subtopics = t.Subtopics.Select(s => s with { Name = tr.SubtopicName(s.Id, s.Name) }).ToList(),
    };

    /// <summary>Topics in the base language (cached once for every locale).</summary>
    private Task<List<TopicDto>> BaseTopicsAsync(CancellationToken ct) =>
        cache.GetOrCreateAsync(CacheKeys.Topics, TimeSpan.FromMinutes(10), async c =>
        {
            var topics = await db.Topics.AsNoTracking().Where(t => t.IsActive).OrderBy(t => t.DisplayOrder)
                .Select(t => new { t.Id, t.Slug, t.Name, t.Description, t.Category, t.Icon, t.DisplayOrder,
                    Subs = t.Subtopics.OrderBy(s => s.DisplayOrder).Select(s => new { s.Id, s.Slug, s.Name, s.DisplayOrder }).ToList() })
                .ToListAsync(c);
            var counts = await db.Questions.AsNoTracking().Where(q => q.IsActive)
                .GroupBy(q => new { q.TopicId, q.SubtopicId, q.Difficulty })
                .Select(g => new { g.Key.TopicId, g.Key.SubtopicId, g.Key.Difficulty, Count = g.Count() })
                .ToListAsync(c);

            int Count(Guid topicId, Difficulty d) => counts.Where(x => x.TopicId == topicId && x.Difficulty == d).Sum(x => x.Count);
            return topics.Select(t => new TopicDto(t.Id, t.Slug, t.Name, t.Description, t.Category, t.Icon, t.DisplayOrder,
                new DifficultyCountsDto(Count(t.Id, Difficulty.Easy), Count(t.Id, Difficulty.Medium), Count(t.Id, Difficulty.Hard), Count(t.Id, Difficulty.Expert)),
                t.Subs.Select(s => new SubtopicDto(s.Id, s.Slug, s.Name, s.DisplayOrder, counts.Where(x => x.SubtopicId == s.Id).Sum(x => x.Count))).ToList()))
                .ToList();
        }, ct);

    public async Task<TopicDetailDto> GetTopicAsync(string slug, Guid? userId, CancellationToken ct)
    {
        var topic = (await ListTopicsAsync(ct)).FirstOrDefault(t => t.Slug == slug) ?? throw new NotFoundException("Topic", slug);
        if (userId is not { } uid)
            return new TopicDetailDto(topic, null, topic.Subtopics.Select(s => new SubtopicProgressDto(s.Slug, s.Name, s.QuestionCount, 0, 0, 0)).ToList(), []);

        var progress = (await TopicProgressAsync(uid, ct)).FirstOrDefault(p => p.TopicSlug == slug);
        var bySub = await db.QuestionAttempts.AsNoTracking().Where(a => a.UserId == uid && a.TopicId == topic.Id)
            .GroupBy(a => a.SubtopicId).Select(g => new { g.Key, Answered = g.Count(), Correct = g.Count(a => a.IsCorrect) }).ToListAsync(ct);
        var subs = topic.Subtopics.Select(s =>
        {
            var x = bySub.FirstOrDefault(b => b.Key == s.Id);
            var answered = x?.Answered ?? 0; var correct = x?.Correct ?? 0;
            return new SubtopicProgressDto(s.Slug, s.Name, s.QuestionCount, answered, correct, answered == 0 ? 0 : Math.Round(100.0 * correct / answered, 1));
        }).ToList();

        var tp = await db.UserTopicProgress.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == uid && p.TopicId == topic.Id, ct);
        var byDifficulty = tp is null ? new List<DifficultyBreakdownDto>() :
        [
            Breakdown("Easy", tp.EasyAnswered, tp.EasyCorrect), Breakdown("Medium", tp.MediumAnswered, tp.MediumCorrect),
            Breakdown("Hard", tp.HardAnswered, tp.HardCorrect), Breakdown("Expert", tp.ExpertAnswered, tp.ExpertCorrect),
        ];
        return new TopicDetailDto(topic, progress, subs, byDifficulty);
    }

    public static DifficultyBreakdownDto Breakdown(string d, int answered, int correct) =>
        new(d, answered, correct, answered == 0 ? 0 : Math.Round(100.0 * correct / answered, 1));

    /// <summary>Per-topic progress for every topic the user has touched (most recent first).</summary>
    public async Task<List<TopicProgressDto>> TopicProgressAsync(Guid userId, CancellationToken ct)
    {
        var topics = await ListTopicsAsync(ct);
        var rows = await db.UserTopicProgress.AsNoTracking().Where(p => p.UserId == userId).ToListAsync(ct);
        var distinct = await db.QuestionAttempts.AsNoTracking().Where(a => a.UserId == userId)
            .GroupBy(a => a.TopicId).Select(g => new { g.Key, Count = g.Select(a => a.QuestionId).Distinct().Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);

        return rows.Join(topics, r => r.TopicId, t => t.Id, (r, t) =>
            {
                var d = distinct.GetValueOrDefault(t.Id);
                var total = t.Questions.Total;
                return new TopicProgressDto(t.Slug, t.Name, t.Icon, t.Category, LevelDto.From(levels.Evaluate(r.XP)), r.QuestionsAnswered,
                    r.CorrectAnswers, r.Accuracy, total, d, total == 0 ? 0 : Math.Round(100.0 * d / total, 1), r.LastActivityAt);
            })
            .OrderByDescending(p => p.LastActivityAt).ToList();
    }

    public async Task<IReadOnlyList<SearchResultDto>> SearchAsync(string? q, CancellationToken ct)
    {
        var term = (q ?? "").Trim().ToLowerInvariant();
        if (term.Length < 2) return [];
        var normalized = term.Replace("c#", "csharp").Replace(".net", "dotnet");

        bool Match(params string[] values) => values.Any(v =>
        {
            var lv = v.ToLowerInvariant();
            return lv.Contains(term) || lv.Contains(normalized) || lv.Replace("-", " ").Contains(term);
        });

        // Matches the English name as well as the request-language name; results are shown in the request language.
        var tr = await localizer.LoadAsync(ct);
        var topics = (await BaseTopicsAsync(ct)).Select(t => (Base: t, Loc: Localize(t, tr))).ToList();
        var results = new List<SearchResultDto>();
        results.AddRange(topics.Where(t => Match(t.Base.Name, t.Loc.Name, t.Base.Slug, t.Base.Category, t.Loc.Category))
            .Select(t => new SearchResultDto("Topic", t.Loc.Slug, t.Loc.Name, t.Loc.Category, t.Loc.Icon, $"/topics/{t.Loc.Slug}")));
        results.AddRange(topics.SelectMany(t => t.Base.Subtopics.Zip(t.Loc.Subtopics)
            .Where(s => Match(s.First.Name, s.Second.Name, s.First.Slug))
            .Select(s => new SearchResultDto("Subtopic", s.Second.Slug, s.Second.Name, t.Loc.Name, t.Loc.Icon, $"/topics/{t.Loc.Slug}?subtopic={s.Second.Slug}"))));

        var roadmaps = await db.Roadmaps.AsNoTracking().Where(r => r.IsPublished)
            .Select(r => new { r.Id, r.Slug, r.Name, r.Category, r.Icon }).ToListAsync(ct);
        results.AddRange(roadmaps
            .Select(r => (Base: r, Name: tr.RoadmapName(r.Id, r.Name), Category: tr.RoadmapCategory(r.Id, r.Category)))
            .Where(r => Match(r.Base.Name, r.Name, r.Base.Slug, r.Base.Category, r.Category))
            .Select(r => new SearchResultDto("Roadmap", r.Base.Slug, r.Name, r.Category, r.Base.Icon, $"/roadmaps/{r.Base.Slug}")));

        return results
            .OrderBy(r => r.Title.Equals(term, StringComparison.OrdinalIgnoreCase) ? 0 : r.Title.StartsWith(term, StringComparison.OrdinalIgnoreCase) ? 1 : 2)
            .ThenBy(r => r.Type == "Topic" ? 0 : r.Type == "Roadmap" ? 1 : 2)
            .Take(20).ToList();
    }
}
