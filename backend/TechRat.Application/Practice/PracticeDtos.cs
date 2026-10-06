using TechRat.Application.Gamification;
using TechRat.Application.Roadmaps;
using TechRat.Domain.Common;

namespace TechRat.Application.Practice;

public sealed record StartPracticeRequest(
    PracticeMode Mode = PracticeMode.Practice,
    string? TopicSlug = null,
    string? SubtopicSlug = null,
    Difficulty? Difficulty = null,
    int? Count = null,
    Guid? RoadmapStepId = null);

public sealed record OptionDto(Guid Id, string Text);

public sealed record AnswerFeedbackDto(
    Guid SelectedOptionId, Guid CorrectOptionId, bool IsCorrect, string Explanation, string ReferenceUrl, int XpEarned);

public sealed record SessionQuestionDto(
    Guid Id, int Index, string TopicSlug, string TopicName, string SubtopicSlug, string SubtopicName,
    Difficulty Difficulty, string Title, string QuestionText, int XpReward, IReadOnlyList<OptionDto> Options,
    AnswerFeedbackDto? Answer);

public sealed record PracticeSessionDto(
    Guid Id, PracticeMode Mode, string? TopicSlug, string? TopicName, string? SubtopicSlug, string? SubtopicName,
    Difficulty? Difficulty, Guid? RoadmapStepId, bool IsDailyChallenge, int TotalQuestions, int AnsweredCount,
    int CorrectCount, int XpEarned, DateTimeOffset StartedAt, DateTimeOffset? CompletedAt,
    IReadOnlyList<SessionQuestionDto> Questions);

public sealed record SubmitAnswerRequest(Guid QuestionId, Guid SelectedOptionId, int TimeSpentSeconds);

public sealed record SessionProgressDto(int Answered, int Total, int Correct, int XpEarned, bool IsComplete);

public sealed record AnswerResultDto(
    AnswerFeedbackDto Feedback,
    int BonusXp,
    long TotalXp,
    LevelDto Level,
    bool LeveledUp,
    string TopicSlug,
    int TopicLevel,
    long TopicXp,
    bool TopicLeveledUp,
    int CurrentStreak,
    bool StreakIncreased,
    int DailyChallengeBonusXp,
    SessionProgressDto Session,
    IReadOnlyList<CompletedStepDto> CompletedSteps);

public sealed record DailyChallengeStatusDto(DateOnly Date, bool Completed, Guid? SessionId, int QuestionsCount, int AnsweredCount, int CorrectCount, int BonusXp);
