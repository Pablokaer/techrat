using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Domain.Content;

namespace TechRat.Application.Resources;

/// <param name="Type">official-docs, article, book, course, video or spec.</param>
/// <param name="Language">Language of the source itself ("en" or "pt-BR"), whatever the request language is.</param>
/// <param name="Note">Why it is recommended, in the request language; null when there is nothing to add.</param>
public sealed record StudySourceDto(string Title, string Url, string Type, string Language, string? Note);

/// <summary>A topic the learner should master, with the sources to learn it from.</summary>
public sealed record StudyTopicDto(string Key, string Name, IReadOnlyList<StudySourceDto> Sources);

/// <summary>General overview reading for a whole roadmap.</summary>
public sealed record RoadmapResourcesDto(IReadOnlyList<StudySourceDto> Sources);

/// <summary>The topics of one module and where to study each.</summary>
public sealed record ModuleResourcesDto(IReadOnlyList<StudyTopicDto> Topics);

/// <summary>The curated reading of one module, shown inside a topic's library so the learner knows where it comes from.</summary>
public sealed record TopicLibraryModuleDto(string Slug, string Name, IReadOnlyList<StudyTopicDto> Topics);

/// <summary>A documentation page cited by questions of the topic, with how many questions rely on it.</summary>
public sealed record CitedReferenceDto(string Url, string Host, int Questions, string ExampleQuestion);

/// <summary>The pages cited by the questions of one subtopic.</summary>
public sealed record CitedSubtopicDto(string Slug, string Name, IReadOnlyList<CitedReferenceDto> References);

/// <summary>
/// Everything to read about one topic: the curated reading of the modules that teach it, plus the official pages its
/// questions cite, so a learner can study the whole topic from one place. <paramref name="TotalLinks"/> counts distinct links.
/// </summary>
public sealed record TopicResourcesDto(IReadOnlyList<TopicLibraryModuleDto> Modules, IReadOnlyList<CitedSubtopicDto> Cited, int TotalLinks);

/// <summary>A question's reference page and title, the input of <see cref="TopicLibrary.Cite"/>.</summary>
public sealed record CitedQuestion(string Url, string Title);

/// <summary>
/// The pure rules behind a topic's library (no I/O, so they are unit tested): modules share links, so a page is listed
/// where it first appears; question references are grouped by page and the most relied-on come first.
/// </summary>
public static class TopicLibrary
{
    /// <summary>Keeps the given module order; a link already listed earlier (in this or a previous module) is dropped, and topics or modules left empty disappear.</summary>
    public static IReadOnlyList<TopicLibraryModuleDto> MergeModules(IEnumerable<(string Slug, string Name, ModuleResourcesDto Resources)> modules)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new List<TopicLibraryModuleDto>();
        foreach (var (slug, name, resources) in modules)
        {
            var topics = new List<StudyTopicDto>();
            foreach (var topic in resources.Topics)
            {
                var fresh = topic.Sources.Where(s => seen.Add(s.Url)).ToList();
                if (fresh.Count > 0) topics.Add(topic with { Sources = fresh });
            }
            if (topics.Count > 0) result.Add(new TopicLibraryModuleDto(slug, name, topics));
        }
        return result;
    }

    /// <summary>Groups question references by page. Blank, non-https and malformed addresses are ignored.</summary>
    public static IReadOnlyList<CitedReferenceDto> Cite(IEnumerable<CitedQuestion> questions) =>
        [.. questions
            .Where(q => Uri.TryCreate(q.Url?.Trim(), UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps)
            .GroupBy(q => q.Url.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => new CitedReferenceDto(g.Key, HostOf(g.Key), g.Count(), g.Select(q => q.Title).Order(StringComparer.Ordinal).First()))
            .OrderByDescending(c => c.Questions).ThenBy(c => c.Url, StringComparer.Ordinal)];

    /// <summary>The site shown next to a reference: the host without a leading "www.".</summary>
    public static string HostOf(string url)
    {
        var host = new Uri(url).Host;
        return host.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? host[4..] : host;
    }

    /// <summary>Distinct links across the curated reading and the cited pages (a page in both counts once).</summary>
    public static int CountDistinctLinks(IEnumerable<TopicLibraryModuleDto> modules, IEnumerable<CitedSubtopicDto> cited) =>
        modules.SelectMany(m => m.Topics).SelectMany(t => t.Sources).Select(s => s.Url)
            .Concat(cited.SelectMany(c => c.References).Select(r => r.Url))
            .Distinct(StringComparer.OrdinalIgnoreCase).Count();
}

/// <summary>Curated study resources (Seed/Data/resources.json), already in the requested language.</summary>
public interface IStudyResourceCatalog
{
    IReadOnlyCollection<string> RoadmapSlugs { get; }
    IReadOnlyCollection<string> ModuleSlugs { get; }
    RoadmapResourcesDto ForRoadmap(string slug, string locale);
    ModuleResourcesDto ForModule(string slug, string locale);
}

/// <summary>Read side of the study resources: checks the roadmap or module exists, then returns its curated reading.</summary>
public sealed class StudyResourceService(IAppDbContext db, IStudyResourceCatalog catalog, ContentLocalizer localizer)
{
    public async Task<RoadmapResourcesDto> ForRoadmapAsync(string slug, CancellationToken ct)
    {
        if (!await db.Roadmaps.AnyAsync(r => r.Slug == slug && r.IsPublished, ct)) throw new NotFoundException("Roadmap", slug);
        return catalog.ForRoadmap(slug, AppLocales.Current);
    }

    public async Task<ModuleResourcesDto> ForModuleAsync(string slug, CancellationToken ct)
    {
        if (!await db.LearningModules.AnyAsync(m => m.Slug == slug && m.IsPublished, ct)) throw new NotFoundException("Module", slug);
        return catalog.ForModule(slug, AppLocales.Current);
    }

    /// <summary>
    /// The library of a topic (Learn): the curated reading of every published module with a step in the topic, in catalog
    /// order, plus the pages cited by the topic's active questions grouped by subtopic. Unknown or inactive topic: 404.
    /// </summary>
    public async Task<TopicResourcesDto> ForTopicAsync(string slug, CancellationToken ct)
    {
        var topic = await db.Topics.AsNoTracking().Include(t => t.Subtopics)
            .FirstOrDefaultAsync(t => t.Slug == slug && t.IsActive, ct) ?? throw new NotFoundException("Topic", slug);
        var tr = await localizer.LoadAsync(ct);

        var modules = await (from m in db.LearningModules.AsNoTracking()
                             where m.IsPublished && db.ModuleSteps.Any(s => s.ModuleId == m.Id && s.IsActive && s.TopicId == topic.Id)
                             orderby m.DisplayOrder, m.Slug
                             select new { m.Id, m.Slug, m.Name }).ToListAsync(ct);
        var library = TopicLibrary.MergeModules(modules.Select(m =>
            (m.Slug, tr.ModuleName(m.Id, m.Name), catalog.ForModule(m.Slug, AppLocales.Current))));

        var questions = await db.Questions.AsNoTracking()
            .Where(q => q.TopicId == topic.Id && q.IsActive && q.ReferenceUrl != "")
            .Select(q => new { q.Id, q.SubtopicId, q.Title, q.ReferenceUrl }).ToListAsync(ct);
        var cited = topic.Subtopics.OrderBy(s => s.DisplayOrder).Select(s => new CitedSubtopicDto(
                s.Slug, tr.SubtopicName(s.Id, s.Name),
                TopicLibrary.Cite(questions.Where(q => q.SubtopicId == s.Id).Select(q => new CitedQuestion(q.ReferenceUrl, tr.QuestionTitle(q.Id, q.Title))))))
            .Where(c => c.References.Count > 0).ToList();

        return new TopicResourcesDto(library, cited, TopicLibrary.CountDistinctLinks(library, cited));
    }
}
