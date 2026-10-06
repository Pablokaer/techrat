using TechRat.Domain.Common;

namespace TechRat.Domain.Practice;

public sealed class PracticeSession
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public PracticeMode Mode { get; set; }
    public Guid? TopicId { get; set; }
    public Guid? SubtopicId { get; set; }
    public Difficulty? Difficulty { get; set; }
    public Guid? RoadmapStepId { get; set; }
    public DateOnly? ChallengeDate { get; set; }
    /// <summary>Ordered question ids chosen by the server when the session starts.</summary>
    public List<Guid> QuestionIds { get; set; } = [];
    public int AnsweredCount { get; set; }
    public int CorrectCount { get; set; }
    public int XpEarned { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public bool IsComplete => AnsweredCount >= QuestionIds.Count;
}

public sealed class QuestionAttempt
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid SelectedOptionId { get; set; }
    public bool IsCorrect { get; set; }
    public int TimeSpentSeconds { get; set; }
    public Difficulty Difficulty { get; set; }
    public int XpEarned { get; set; }
    public DateTimeOffset AnsweredAt { get; set; }
    public Guid? PracticeSessionId { get; set; }
    // Denormalised for analytics queries without joins.
    public Guid TopicId { get; set; }
    public Guid SubtopicId { get; set; }
}

public sealed class DailyChallengeCompletion
{
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public Guid PracticeSessionId { get; set; }
    public int CorrectCount { get; set; }
    public int BonusXp { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
}
