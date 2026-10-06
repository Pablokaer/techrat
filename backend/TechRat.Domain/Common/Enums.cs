namespace TechRat.Domain.Common;

public enum Difficulty
{
    Easy = 1,
    Medium = 2,
    Hard = 3,
    Expert = 4,
}

/// <summary>Only MultipleChoice is playable in the MVP; the others reserve the shape for future question kinds.</summary>
public enum QuestionType
{
    MultipleChoice = 1,
    MultipleSelect = 2,
    TrueFalse = 3,
    CodingChallenge = 4,
    CodeOutput = 5,
    Debugging = 6,
    ArchitectureScenario = 7,
}

public enum PracticeMode
{
    Practice = 1,
    Challenge = 2,
    Random = 3,
    Adaptive = 4,
    DailyChallenge = 5,
    Roadmap = 6,
    /// <summary>Questions the learner picked on a topic's page (Learn), answered in the order chosen.</summary>
    Learn = 7,
}

public enum XpReason
{
    CorrectAnswer = 1,
    QuestionCompleted = 2,
    RoadmapStepCompleted = 3,
    RoadmapModuleCompleted = 4,
    RoadmapCompleted = 5,
    AchievementUnlocked = 6,
    DailyStreak = 7,
    ChallengeCompleted = 8,
}

public enum XpSourceType
{
    Question = 1,
    RoadmapStep = 2,
    RoadmapModule = 3,
    Roadmap = 4,
    Achievement = 5,
    Streak = 6,
    DailyChallenge = 7,
}

public enum RoadmapDifficulty
{
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3,
    Expert = 4,
}

public enum AchievementRuleType
{
    QuestionsAnswered = 1,
    CorrectAnswers = 2,
    StreakDays = 3,
    Accuracy = 4,
    TopicCorrect = 5,
    TopicLevel = 6,
    RoadmapCompleted = 7,
    RoadmapsCompleted = 8,
    GlobalRank = 9,
}

public enum BadgeTier
{
    Bronze = 1,
    Silver = 2,
    Gold = 3,
    Platinum = 4,
}
