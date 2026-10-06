using TechRat.Domain.Common;

namespace TechRat.Domain.Roadmaps;

/// <summary>A career, role or skill path: an ordered composition of catalog modules (see ADR-0012).</summary>
public sealed class Roadmap
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public RoadmapDifficulty Difficulty { get; set; }
    public int EstimatedHours { get; set; }
    /// <summary>Steps of the required modules (denormalised; recomputed whenever the composition changes).</summary>
    public int StepsCount { get; set; }
    public string Icon { get; set; } = "map";
    public bool IsPublished { get; set; } = true;
    public int DisplayOrder { get; set; }
    public int XPReward { get; set; }
    /// <summary>
    /// Position among the platform's top roadmaps for junior developers (1 = most recommended); null when the roadmap
    /// is not one of them. Curated in the seed (roadmaps.py JUNIOR_TOP) and drives the "Recommended for juniors" filter.
    /// </summary>
    public int? JuniorRank { get; set; }
    /// <summary>True while the composition mirrors the seed file; false once an admin changed it (the seed then leaves it alone).</summary>
    public bool CompositionSeedManaged { get; set; } = true;
    public List<RoadmapModuleLink> Links { get; set; } = [];
    public List<RoadmapDependency> Dependencies { get; set; } = [];
}

public enum ModuleKind
{
    /// <summary>Shared building block reused by several roadmaps.</summary>
    Core = 1,
    /// <summary>Specific to one roadmap.</summary>
    Context = 2,
    /// <summary>Scenario pack (Hard/Expert heavy) that plugs into several roadmaps.</summary>
    BestPractices = 3,
    /// <summary>Final mixed-topic challenge of a roadmap.</summary>
    Capstone = 4,
}

/// <summary>
/// Reusable learning unit of the module catalog. Its steps are proven once per learner and count in every roadmap
/// that contains the module. Named LearningModule because TechRat.Modules is a project namespace.
/// </summary>
public sealed class LearningModule
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string Description { get; set; } = "";
    public ModuleKind Kind { get; set; } = ModuleKind.Core;
    public string Category { get; set; } = "";
    public RoadmapDifficulty Level { get; set; } = RoadmapDifficulty.Beginner;
    public string Icon { get; set; } = "layers";
    public int EstimatedMinutes { get; set; }
    public int XPReward { get; set; }
    /// <summary>Incremented when steps are added. Completions record the version they completed and are never revoked.</summary>
    public int Version { get; set; } = 1;
    public bool IsPublished { get; set; } = true;
    /// <summary>Allowed to exist without belonging to a roadmap (shown in the module catalog only).</summary>
    public bool IsStandalone { get; set; }
    public int DisplayOrder { get; set; }
    /// <summary>True while the module mirrors the seed file; false once an admin edited it.</summary>
    public bool SeedManaged { get; set; } = true;
    public List<ModuleStep> Steps { get; set; } = [];
    public List<ModuleDependency> Dependencies { get; set; } = [];
}

public sealed class ModuleStep
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ModuleId { get; set; }
    /// <summary>Position inside the module (1-based). Steps unlock in this order.</summary>
    public int Order { get; set; }
    public required string Title { get; set; }
    public string Description { get; set; } = "";
    public Difficulty Difficulty { get; set; }
    public int EstimatedMinutes { get; set; }
    public Guid TopicId { get; set; }
    /// <summary>Optional narrower scope. When null the whole topic counts.</summary>
    public Guid? SubtopicId { get; set; }
    public int MinimumQuestions { get; set; }
    /// <summary>Percentage 0-100.</summary>
    public int MinimumAccuracy { get; set; }
    public int XPReward { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Module version that introduced this step ("new content" for learners who completed an older version).</summary>
    public int AddedInVersion { get; set; } = 1;
}

/// <summary>Places a module in a roadmap. Optional modules are shown but never block progress.</summary>
public sealed class RoadmapModuleLink
{
    public Guid RoadmapId { get; set; }
    public Guid ModuleId { get; set; }
    public LearningModule? Module { get; set; }
    public int Order { get; set; }
    public bool IsRequired { get; set; } = true;
}

/// <summary>Module <see cref="ModuleId"/> builds on <see cref="RequiredModuleId"/> (guidance; cycles are rejected).</summary>
public sealed class ModuleDependency
{
    public Guid ModuleId { get; set; }
    public Guid RequiredModuleId { get; set; }
}

/// <summary>Roadmap <see cref="RoadmapId"/> unlocks when <see cref="RequiredRoadmapId"/> reaches <see cref="MinimumPercent"/>.</summary>
public sealed class RoadmapDependency
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid RoadmapId { get; set; }
    public Guid RequiredRoadmapId { get; set; }
    public Roadmap? RequiredRoadmap { get; set; }
    public int MinimumPercent { get; set; } = 100;
}

/// <summary>Enrolment in a roadmap and its completion (the roadmap XP is paid once, when <see cref="CompletedAt"/> is first set).</summary>
public sealed class UserRoadmapProgress
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public Guid RoadmapId { get; set; }
    /// <summary>Completed steps of the roadmap's required modules.</summary>
    public int CompletedSteps { get; set; }
    /// <summary>The next step to work on (a <see cref="ModuleStep"/> id).</summary>
    public Guid? CurrentStepId { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset LastActivityAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

/// <summary>A learner's progress in a catalog module, shared by every roadmap that contains it.</summary>
public sealed class UserModuleProgress
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public Guid ModuleId { get; set; }
    public int CompletedSteps { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    /// <summary>Set once, when every step of the module version was completed. Never cleared (module XP is paid once).</summary>
    public DateTimeOffset? CompletedAt { get; set; }
    public int? CompletedVersion { get; set; }
}

/// <summary>Global, permanent credit for a step: it counts in every roadmap containing the step's module.</summary>
public sealed class UserModuleStepCompletion
{
    public Guid UserId { get; set; }
    public Guid ModuleStepId { get; set; }
    public Guid ModuleId { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    /// <summary>False for credits mapped from older data (the XP was already paid elsewhere).</summary>
    public bool XpAwarded { get; set; } = true;
}
