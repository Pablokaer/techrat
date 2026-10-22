using System.Text.Json;
using TechRat.Application.Common;
using TechRat.Domain.Content;
using TechRat.Infrastructure.Seed;

namespace TechRat.Tests.Unit;

/// <summary>
/// Catalog and question translations are applied per content item (ADR-0043): each content type translates all of its
/// declared fields at once, falls back to English per field, and leaves English untouched.
/// </summary>
public class ContentTranslationsTests
{
    private static readonly Guid Id = Guid.NewGuid();

    /// <summary>A pt-BR dictionary holding "pt:&lt;field&gt;" for the given fields of <see cref="Id"/>.</summary>
    private static ContentTranslations Pt(string entityType, params string[] fields) =>
        new(fields.ToDictionary(f => ContentTranslations.Key(entityType, Id, f), f => $"pt:{f}"));

    private static Task<ContentTranslations> English() =>
        // English never reads the database or the cache.
        new ContentLocalizer(null!, null!).LoadAsync(AppLocales.English, CancellationToken.None);

    [Fact]
    public async Task Topic_translates_name_description_and_category_at_once()
    {
        var en = new TopicTexts("Data Structures", "Arrays and lists", "Computer Science");
        var all = TranslatableContent.Fields[TranslatableEntity.Topic].ToArray();

        Assert.Equal(new TopicTexts("pt:name", "pt:description", "pt:category"), Pt(TranslatableEntity.Topic, all).Topic(Id, en));
        Assert.Equal(en with { Name = "pt:name" }, Pt(TranslatableEntity.Topic, TranslatableField.Name).Topic(Id, en));
        Assert.Equal(en, Pt(TranslatableEntity.Topic, all).Topic(Guid.NewGuid(), en));
        Assert.Equal(en, (await English()).Topic(Id, en));
    }

    [Fact]
    public async Task Subtopic_translates_its_name()
    {
        Assert.Equal("pt:name", Pt(TranslatableEntity.Subtopic, TranslatableField.Name).SubtopicName(Id, "Arrays"));
        Assert.Equal("Arrays", Pt(TranslatableEntity.Topic, TranslatableField.Name).SubtopicName(Id, "Arrays"));
        Assert.Equal("Arrays", (await English()).SubtopicName(Id, "Arrays"));
    }

    [Fact]
    public async Task Roadmap_translates_name_description_and_category_at_once()
    {
        var en = new RoadmapTexts("Backend", "Build APIs", "Career");
        var all = TranslatableContent.Fields[TranslatableEntity.Roadmap].ToArray();

        Assert.Equal(new RoadmapTexts("pt:name", "pt:description", "pt:category"), Pt(TranslatableEntity.Roadmap, all).Roadmap(Id, en));
        Assert.Equal(en with { Category = "pt:category" }, Pt(TranslatableEntity.Roadmap, TranslatableField.Category).Roadmap(Id, en));
        Assert.Equal(en, (await English()).Roadmap(Id, en));
        Assert.Equal("pt:name", Pt(TranslatableEntity.Roadmap, all).RoadmapName(Id, "Backend"));
        Assert.Equal("Backend", (await English()).RoadmapName(Id, "Backend"));
    }

    [Fact]
    public async Task Module_translates_name_and_description_at_once()
    {
        var en = new ModuleTexts("Basics", "The building blocks");
        var all = TranslatableContent.Fields[TranslatableEntity.Module].ToArray();

        Assert.Equal(new ModuleTexts("pt:name", "pt:description"), Pt(TranslatableEntity.Module, all).Module(Id, en));
        Assert.Equal(en with { Description = "pt:description" }, Pt(TranslatableEntity.Module, TranslatableField.Description).Module(Id, en));
        Assert.Equal(en, (await English()).Module(Id, en));
        Assert.Equal("pt:name", Pt(TranslatableEntity.Module, all).ModuleName(Id, "Basics"));
    }

    [Fact]
    public async Task Step_translates_title_and_description_at_once()
    {
        var en = new StepTexts("Arrays", "Answer questions about arrays");
        var all = TranslatableContent.Fields[TranslatableEntity.ModuleStep].ToArray();

        Assert.Equal(new StepTexts("pt:title", "pt:description"), Pt(TranslatableEntity.ModuleStep, all).Step(Id, en));
        Assert.Equal(en with { Title = "pt:title" }, Pt(TranslatableEntity.ModuleStep, TranslatableField.Title).Step(Id, en));
        Assert.Equal(en, (await English()).Step(Id, en));
        Assert.Equal("pt:title", Pt(TranslatableEntity.ModuleStep, all).StepTitle(Id, "Arrays"));
    }

    [Fact]
    public async Task Achievement_translates_name_description_and_category_at_once()
    {
        var en = new AchievementTexts("First Question", "Answer your first question.", "Milestones");
        var all = TranslatableContent.Fields[TranslatableEntity.Achievement].ToArray();

        Assert.Equal(new AchievementTexts("pt:name", "pt:description", "pt:category"), Pt(TranslatableEntity.Achievement, all).Achievement(Id, en));
        Assert.Equal(en with { Name = "pt:name" }, Pt(TranslatableEntity.Achievement, TranslatableField.Name).Achievement(Id, en));
        Assert.Equal(en, (await English()).Achievement(Id, en));
    }

    [Fact]
    public async Task Question_translates_title_text_and_explanation_at_once_and_options_by_text()
    {
        var en = new QuestionTexts("Big O", "What is O(1)?", "Constant time.");
        var all = TranslatableContent.Fields[TranslatableEntity.Question].ToArray();

        Assert.Equal(new QuestionTexts("pt:title", "pt:text", "pt:explanation"), Pt(TranslatableEntity.Question, all).Question(Id, en));
        Assert.Equal(en with { Explanation = "pt:explanation" }, Pt(TranslatableEntity.Question, TranslatableField.Explanation).Question(Id, en));
        Assert.Equal(en, (await English()).Question(Id, en));
        Assert.Equal("pt:title", Pt(TranslatableEntity.Question, all).QuestionTitle(Id, "Big O"));
        Assert.Equal("pt:text", Pt(TranslatableEntity.QuestionOption, TranslatableField.Text).OptionText(Id, "Constant"));
        Assert.Equal("Constant", (await English()).OptionText(Id, "Constant"));
    }

    [Fact]
    public void Blank_translations_fall_back_to_english()
    {
        var tr = new ContentTranslations(new Dictionary<string, string> { [ContentTranslations.Key(TranslatableEntity.Topic, Id, TranslatableField.Name)] = "  " });
        Assert.Equal("Data Structures", tr.Topic(Id, new TopicTexts("Data Structures", "d", "c")).Name);
    }

    /// <summary>The texts record of each content type has exactly the declared fields (so the item operation can apply them all).</summary>
    [Theory]
    [InlineData(TranslatableEntity.Topic, typeof(TopicTexts))]
    [InlineData(TranslatableEntity.Roadmap, typeof(RoadmapTexts))]
    [InlineData(TranslatableEntity.Module, typeof(ModuleTexts))]
    [InlineData(TranslatableEntity.ModuleStep, typeof(StepTexts))]
    [InlineData(TranslatableEntity.Achievement, typeof(AchievementTexts))]
    [InlineData(TranslatableEntity.Question, typeof(QuestionTexts))]
    public void Each_texts_record_matches_the_declared_fields(string entityType, Type texts)
    {
        var properties = texts.GetConstructors().Single().GetParameters().Select(p => p.Name!.ToLowerInvariant()).Order();
        Assert.Equal(TranslatableContent.Fields[entityType].Order(), properties);
    }

    [Fact]
    public void Every_field_in_the_catalog_translation_file_is_declared()
    {
        using var doc = JsonDocument.Parse(Resource(n => n.EndsWith(".Seed.Data.i18n.pt-BR.json", StringComparison.Ordinal)).Single());
        // Section of the file → entity type; nested dictionaries → (entity type, field) of their values.
        var sections = new Dictionary<string, string>
        {
            ["topics"] = TranslatableEntity.Topic, ["roadmaps"] = TranslatableEntity.Roadmap,
            ["achievements"] = TranslatableEntity.Achievement, ["modules"] = TranslatableEntity.Module,
        };
        var nested = new Dictionary<string, (string Entity, string Field)>
        {
            ["subtopics"] = (TranslatableEntity.Subtopic, TranslatableField.Name),
            ["steps"] = (TranslatableEntity.ModuleStep, TranslatableField.Title),
        };

        var seen = new HashSet<(string, string)>();
        foreach (var section in doc.RootElement.EnumerateObject())
        {
            Assert.True(sections.TryGetValue(section.Name, out var entity), $"Unknown section '{section.Name}' in pt-BR.json");
            foreach (var item in section.Value.EnumerateObject())
            foreach (var field in item.Value.EnumerateObject())
            {
                if (field.Value.ValueKind == JsonValueKind.Object)
                {
                    Assert.True(nested.TryGetValue(field.Name, out var child), $"Unknown nested field '{section.Name}.{field.Name}'");
                    seen.Add(child);
                }
                else seen.Add((entity!, field.Name));
            }
        }

        Assert.NotEmpty(seen);
        Assert.All(seen, f => Assert.Contains(f.Item2, TranslatableContent.Fields[f.Item1]));
    }

    [Fact]
    public void Every_field_in_the_question_translation_files_is_declared()
    {
        // File property → (entity type, field); "id" is the natural key.
        var map = new Dictionary<string, (string Entity, string Field)>
        {
            ["title"] = (TranslatableEntity.Question, TranslatableField.Title),
            ["question"] = (TranslatableEntity.Question, TranslatableField.Text),
            ["explanation"] = (TranslatableEntity.Question, TranslatableField.Explanation),
            ["options"] = (TranslatableEntity.QuestionOption, TranslatableField.Text),
        };
        var files = Resource(n => n.Contains(".Seed.Data.i18n.questions.", StringComparison.Ordinal)).ToList();
        Assert.NotEmpty(files);

        foreach (var json in files)
        {
            using var doc = JsonDocument.Parse(json);
            foreach (var property in doc.RootElement.EnumerateArray().SelectMany(q => q.EnumerateObject()).Select(p => p.Name).Distinct())
            {
                if (property == "id") continue;
                Assert.True(map.TryGetValue(property, out var f), $"Unknown question translation field '{property}'");
                Assert.Contains(f.Field, TranslatableContent.Fields[f.Entity]);
            }
        }
    }

    private static IEnumerable<string> Resource(Func<string, bool> name)
    {
        var asm = typeof(DatabaseSeeder).Assembly;
        foreach (var resource in asm.GetManifestResourceNames().Where(name))
        {
            using var reader = new StreamReader(asm.GetManifestResourceStream(resource)!);
            yield return reader.ReadToEnd();
        }
    }
}
