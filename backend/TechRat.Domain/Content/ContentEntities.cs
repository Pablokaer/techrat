using TechRat.Domain.Common;

namespace TechRat.Domain.Content;

public sealed class Topic
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public string Icon { get; set; } = "code";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public List<Subtopic> Subtopics { get; set; } = [];
}

public sealed class Subtopic
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid TopicId { get; set; }
    public Topic? Topic { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class Question
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    /// <summary>Stable key used by the idempotent seed (e.g. "ds-arrays-index-access"). Null for admin-created questions.</summary>
    public string? ExternalKey { get; set; }
    public Guid TopicId { get; set; }
    public Topic? Topic { get; set; }
    public Guid SubtopicId { get; set; }
    public Subtopic? Subtopic { get; set; }
    public Difficulty Difficulty { get; set; }
    public QuestionType QuestionType { get; set; } = QuestionType.MultipleChoice;
    public required string Title { get; set; }
    public required string QuestionText { get; set; }
    public string Explanation { get; set; } = "";
    public string ReferenceUrl { get; set; } = "";
    public int XPReward { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<QuestionOption> Options { get; set; } = [];
}

public sealed class QuestionOption
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid QuestionId { get; set; }
    public required string Text { get; set; }
    public bool IsCorrect { get; set; }
    public int DisplayOrder { get; set; }
}

/// <summary>
/// Translation of one text field of a catalog entity (topic, subtopic, roadmap, module, step, achievement).
/// The entity's own columns hold the base (English) text; missing translations fall back to it.
/// </summary>
public sealed class ContentTranslation
{
    /// <summary>See <see cref="TranslatableEntity"/>.</summary>
    public required string EntityType { get; set; }
    public Guid EntityId { get; set; }
    /// <summary>BCP 47 tag, e.g. "pt-BR".</summary>
    public required string Locale { get; set; }
    /// <summary>See <see cref="TranslatableField"/>.</summary>
    public required string Field { get; set; }
    public required string Value { get; set; }
    /// <summary>True while the row mirrors the seed file (the seed may refresh it); false once an admin customised it.</summary>
    public bool SeedManaged { get; set; } = true;
}

public static class TranslatableEntity
{
    public const string Topic = "topic";
    public const string Subtopic = "subtopic";
    public const string Roadmap = "roadmap";
    public const string Module = "module";
    public const string ModuleStep = "module-step";
    public const string Achievement = "achievement";
    public const string Question = "question";
    public const string QuestionOption = "question-option";
}

public static class TranslatableField
{
    public const string Name = "name";
    public const string Title = "title";
    public const string Description = "description";
    public const string Category = "category";
    /// <summary>Question text and option text.</summary>
    public const string Text = "text";
    public const string Explanation = "explanation";
}
