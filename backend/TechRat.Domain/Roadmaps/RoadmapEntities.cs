using TechRat.Domain.Common;

namespace TechRat.Domain.Roadmaps;

public sealed class Roadmap
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public RoadmapDifficulty Difficulty { get; set; }
    public int EstimatedHours { get; set; }
    public int StepsCount { get; set; }
    public string Icon { get; set; } = "map";
    public bool IsPublished { get; set; } = true;
    public int DisplayOrder { get; set; }
    public int XPReward { get; set; }
    public List<RoadmapModule> Modules { get; set; } = [];
    public List<RoadmapStep> Steps { get; set; } = [];
    public List<RoadmapDependency> Dependencies { get; set; } = [];
}

public sealed class RoadmapModule
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid RoadmapId { get; set; }
    public required string Title { get; set; }
    public int Order { get; set; }
    public int XPReward { get; set; }
}

public sealed class RoadmapStep
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid RoadmapId { get; set; }
    public Guid ModuleId { get; set; }
    public required string Title { get; set; }
    public string Description { get; set; } = "";
    public int Order { get; set; }
    public Difficulty Difficulty { get; set; }
    public int EstimatedMinutes { get; set; }
    public Guid TopicId { get; set; }
    /// <summary>Optional narrower scope. When null the whole topic counts.</summary>
    public Guid? SubtopicId { get; set; }
    public int MinimumQuestions { get; set; }
    /// <summary>Percentage 0-100.</summary>
    public int MinimumAccuracy { get; set; }
    public int XPReward { get; set; }
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

public sealed class UserRoadmapProgress
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public Guid RoadmapId { get; set; }
    public int CompletedSteps { get; set; }
    public Guid? CurrentStepId { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset LastActivityAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

public sealed class UserRoadmapStepCompletion
{
    public Guid UserId { get; set; }
    public Guid RoadmapStepId { get; set; }
    public Guid RoadmapId { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
}
