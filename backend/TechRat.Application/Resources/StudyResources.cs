using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;

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

/// <summary>Curated study resources (Seed/Data/resources.json), already in the requested language.</summary>
public interface IStudyResourceCatalog
{
    IReadOnlyCollection<string> RoadmapSlugs { get; }
    IReadOnlyCollection<string> ModuleSlugs { get; }
    RoadmapResourcesDto ForRoadmap(string slug, string locale);
    ModuleResourcesDto ForModule(string slug, string locale);
}

/// <summary>Read side of the study resources: checks the roadmap or module exists, then returns its curated reading.</summary>
public sealed class StudyResourceService(IAppDbContext db, IStudyResourceCatalog catalog)
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
}
