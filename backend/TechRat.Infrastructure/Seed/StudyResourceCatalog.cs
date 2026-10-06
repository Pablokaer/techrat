using System.Text.Json;
using TechRat.Application.Common;
using TechRat.Application.Resources;

namespace TechRat.Infrastructure.Seed;

/// <summary>
/// Study resources read once from the embedded Seed/Data/resources.json (ADR-0020). The content is curated in git,
/// bilingual in the file and read-only at run time, so it needs no tables: topic names and notes are picked per request
/// language, and a source in the request language is listed before the others of its topic.
/// </summary>
public sealed class StudyResourceCatalog : IStudyResourceCatalog
{
    private sealed record Text(string En, string PtBr)
    {
        public string For(string locale) => locale == AppLocales.PortugueseBrazil ? PtBr : En;
    }
    private sealed record Source(string Title, string Url, string Type, string Language, Text? Note);
    private sealed record Topic(string Key, Text Name, List<Source> Sources);

    private readonly Dictionary<string, List<Source>> _roadmaps = [];
    private readonly Dictionary<string, List<Topic>> _modules = [];

    public StudyResourceCatalog()
    {
        var asm = typeof(StudyResourceCatalog).Assembly;
        var name = asm.GetManifestResourceNames().Single(n => n.EndsWith(".Seed.Data.resources.json", StringComparison.Ordinal));
        using var doc = JsonDocument.Parse(asm.GetManifestResourceStream(name)!);

        static Text? ReadText(JsonElement e, string property) =>
            e.TryGetProperty(property, out var t) ? new Text(t.GetProperty("en").GetString()!, t.GetProperty("pt-BR").GetString()!) : null;
        static List<Source> ReadSources(JsonElement array) => [.. array.EnumerateArray().Select(s => new Source(
            s.GetProperty("title").GetString()!, s.GetProperty("url").GetString()!, s.GetProperty("type").GetString()!,
            s.GetProperty("language").GetString()!, ReadText(s, "note")))];

        foreach (var r in doc.RootElement.GetProperty("roadmaps").EnumerateObject())
            _roadmaps[r.Name] = ReadSources(r.Value.GetProperty("sources"));
        foreach (var m in doc.RootElement.GetProperty("modules").EnumerateObject())
            _modules[m.Name] = [.. m.Value.GetProperty("topics").EnumerateArray()
                .Select(t => new Topic(t.GetProperty("key").GetString()!, ReadText(t, "name")!, ReadSources(t.GetProperty("sources"))))];
    }

    public IReadOnlyCollection<string> RoadmapSlugs => _roadmaps.Keys;
    public IReadOnlyCollection<string> ModuleSlugs => _modules.Keys;

    public RoadmapResourcesDto ForRoadmap(string slug, string locale) =>
        new(_roadmaps.TryGetValue(slug, out var sources) ? Order(sources, locale) : []);

    public ModuleResourcesDto ForModule(string slug, string locale) =>
        new(_modules.TryGetValue(slug, out var topics) ? [.. topics.Select(t => new StudyTopicDto(t.Key, t.Name.For(locale), Order(t.Sources, locale)))] : []);

    /// <summary>Sources in the request language first; otherwise the authored order (OrderBy is stable).</summary>
    private static List<StudySourceDto> Order(List<Source> sources, string locale) =>
        [.. sources.OrderBy(s => s.Language == locale ? 0 : 1).Select(s => new StudySourceDto(s.Title, s.Url, s.Type, s.Language, s.Note?.For(locale)))];
}
