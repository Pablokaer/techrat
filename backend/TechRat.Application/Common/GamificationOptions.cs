using TechRat.Domain.Common;

namespace TechRat.Application.Common;

/// <summary>All tunable XP numbers. Bound from the "Gamification" configuration section.</summary>
public sealed class GamificationOptions
{
    public const string Section = "Gamification";

    public int EasyXp { get; set; } = 10;
    public int MediumXp { get; set; } = 25;
    public int HardXp { get; set; } = 50;
    public int ExpertXp { get; set; } = 100;

    public int RoadmapStepXp { get; set; } = 50;
    public int RoadmapModuleXp { get; set; } = 150;
    public int RoadmapCompletedXp { get; set; } = 1000;

    public int DailyStreakXp { get; set; } = 5;
    public int DailyChallengeBonusXp { get; set; } = 100;
    public int DailyChallengeSize { get; set; } = 5;

    public int LevelBaseXp { get; set; } = 100;
    public int LevelIncrementXp { get; set; } = 50;
    public int MaxLevel { get; set; } = 100;

    public int DefaultStepMinimumQuestions { get; set; } = 5;
    public int DefaultStepMinimumAccuracy { get; set; } = 70;

    public int XpFor(Difficulty difficulty) => difficulty switch
    {
        Difficulty.Easy => EasyXp,
        Difficulty.Medium => MediumXp,
        Difficulty.Hard => HardXp,
        Difficulty.Expert => ExpertXp,
        _ => EasyXp,
    };
}
