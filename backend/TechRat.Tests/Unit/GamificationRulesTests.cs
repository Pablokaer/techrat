using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Application.Gamification;
using TechRat.Domain.Common;
using TechRat.Domain.Gamification;
using TechRat.Domain.Users;

namespace TechRat.Tests.Unit;

public class LevelServiceTests
{
    private static LevelService Service(int baseXp = 100, int inc = 50) =>
        new(Options.Create(new GamificationOptions { LevelBaseXp = baseXp, LevelIncrementXp = inc }));

    [Theory]
    [InlineData(1, 0)]
    [InlineData(2, 100)]
    [InlineData(3, 250)]
    [InlineData(4, 450)]
    [InlineData(5, 700)]
    [InlineData(6, 1000)]
    public void Cumulative_thresholds_follow_progressive_curve(int level, long expected) =>
        Assert.Equal(expected, Service().TotalXpToReach(level));

    [Theory]
    [InlineData(0, 1)]
    [InlineData(99, 1)]
    [InlineData(100, 2)]
    [InlineData(249, 2)]
    [InlineData(250, 3)]
    [InlineData(699, 4)]
    [InlineData(700, 5)]
    public void Level_for_xp(long xp, int expected) => Assert.Equal(expected, Service().LevelFor(xp));

    [Fact]
    public void Each_level_costs_more_than_the_previous()
    {
        var curve = new LevelCurve();
        for (var l = 1; l < 50; l++) Assert.True(curve.XpForLevel(l + 1) > curve.XpForLevel(l));
    }

    [Fact]
    public void Evaluate_reports_progress_inside_level()
    {
        var info = Service().Evaluate(175); // level 2 spans 100..250
        Assert.Equal(2, info.Level);
        Assert.Equal(75, info.XpIntoLevel);
        Assert.Equal(150, info.XpForThisLevel);
        Assert.Equal(75, info.XpToNextLevel);
        Assert.Equal(50, info.ProgressPercent);
    }

    [Fact]
    public void Curve_is_configurable_and_capped()
    {
        var curve = new LevelCurve(baseXp: 10, incrementXp: 0, maxLevel: 5);
        Assert.Equal(3, curve.Evaluate(20).Level);
        Assert.Equal(5, curve.Evaluate(1_000_000).Level);
        Assert.Equal(100, curve.Evaluate(1_000_000).ProgressPercent);
    }

    [Fact]
    public void Negative_xp_is_level_one() => Assert.Equal(1, new LevelCurve().Evaluate(-5).Level);
}

public class XpRulesTests
{
    [Theory]
    [InlineData(Difficulty.Easy, 10)]
    [InlineData(Difficulty.Medium, 25)]
    [InlineData(Difficulty.Hard, 50)]
    [InlineData(Difficulty.Expert, 100)]
    public void Default_xp_by_difficulty(Difficulty d, int xp) => Assert.Equal(xp, new GamificationOptions().XpFor(d));

    [Fact]
    public void Xp_values_are_configurable() =>
        Assert.Equal(7, new GamificationOptions { EasyXp = 7 }.XpFor(Difficulty.Easy));

    [Fact]
    public void User_and_topic_accuracy_are_recomputed_per_answer()
    {
        var user = new User { Username = "u", DisplayName = "u", Email = "u@x.io" };
        user.RecordAnswer(true); user.RecordAnswer(false); user.RecordAnswer(true);
        Assert.Equal(3, user.QuestionsAnswered);
        Assert.Equal(66.67, user.GlobalAccuracy);

        var topic = new UserTopicProgress();
        topic.RecordAnswer(Difficulty.Hard, true, DateTimeOffset.UtcNow);
        topic.RecordAnswer(Difficulty.Hard, false, DateTimeOffset.UtcNow);
        topic.RecordAnswer(Difficulty.Easy, true, DateTimeOffset.UtcNow);
        Assert.Equal((2, 1, 1, 1), (topic.HardAnswered, topic.HardCorrect, topic.EasyAnswered, topic.EasyCorrect));
        Assert.Equal(66.67, topic.Accuracy);
    }
}

public class StreakRulesTests
{
    private static readonly DateOnly Today = new(2026, 10, 5);

    [Fact]
    public void First_activity_starts_streak() =>
        Assert.Equal((1, 1, true), StreakRules.Apply(null, 0, 0, Today));

    [Fact]
    public void Same_day_does_not_increment() =>
        Assert.Equal((3, 5, false), StreakRules.Apply(Today, 3, 5, Today));

    [Fact]
    public void Consecutive_day_increments_and_updates_longest() =>
        Assert.Equal((6, 6, true), StreakRules.Apply(Today.AddDays(-1), 5, 5, Today));

    [Fact]
    public void Gap_resets_to_one_but_keeps_longest() =>
        Assert.Equal((1, 9, true), StreakRules.Apply(Today.AddDays(-3), 9, 9, Today));

    [Theory]
    [InlineData(0, 4)]
    [InlineData(-1, 4)]
    [InlineData(-2, 0)]
    public void Effective_streak_breaks_after_a_missed_day(int lastOffset, int expected) =>
        Assert.Equal(expected, StreakRules.Effective(Today.AddDays(lastOffset), 4, Today));
}

public class AchievementRulesTests
{
    private static AchievementContext Ctx(int answered = 0, int correct = 0, double acc = 0, int streak = 0, int longest = 0,
        long xp = 0, int rank = 0, Dictionary<string, (int, int)>? topics = null, HashSet<string>? roadmaps = null) =>
        new(answered, correct, acc, streak, longest, xp, rank, topics ?? [], roadmaps ?? []);

    private static Achievement A(AchievementRuleType type, int threshold, string? slug = null, int? secondary = null) =>
        new() { Code = "x", Name = "x", RuleType = type, Threshold = threshold, TargetSlug = slug, SecondaryThreshold = secondary };

    [Fact]
    public void Questions_and_correct_counts()
    {
        Assert.True(AchievementRules.IsSatisfied(A(AchievementRuleType.QuestionsAnswered, 10), Ctx(answered: 10)));
        Assert.False(AchievementRules.IsSatisfied(A(AchievementRuleType.QuestionsAnswered, 10), Ctx(answered: 9)));
        Assert.True(AchievementRules.IsSatisfied(A(AchievementRuleType.CorrectAnswers, 1), Ctx(correct: 1)));
    }

    [Fact]
    public void Streak_uses_longest_ever() =>
        Assert.True(AchievementRules.IsSatisfied(A(AchievementRuleType.StreakDays, 7), Ctx(streak: 1, longest: 7)));

    [Fact]
    public void Accuracy_requires_minimum_evidence()
    {
        var rule = A(AchievementRuleType.Accuracy, 80, secondary: 50);
        Assert.False(AchievementRules.IsSatisfied(rule, Ctx(answered: 10, acc: 100)));
        Assert.True(AchievementRules.IsSatisfied(rule, Ctx(answered: 50, acc: 80)));
        Assert.False(AchievementRules.IsSatisfied(rule, Ctx(answered: 60, acc: 79.9)));
    }

    [Fact]
    public void Topic_rules()
    {
        var topics = new Dictionary<string, (int, int)> { ["algorithms"] = (12, 5) };
        Assert.True(AchievementRules.IsSatisfied(A(AchievementRuleType.TopicCorrect, 10, "algorithms"), Ctx(topics: topics)));
        Assert.True(AchievementRules.IsSatisfied(A(AchievementRuleType.TopicLevel, 5, "algorithms"), Ctx(topics: topics)));
        Assert.False(AchievementRules.IsSatisfied(A(AchievementRuleType.TopicLevel, 6, "algorithms"), Ctx(topics: topics)));
        Assert.False(AchievementRules.IsSatisfied(A(AchievementRuleType.TopicCorrect, 1, "databases"), Ctx(topics: topics)));
    }

    [Fact]
    public void Roadmap_rules()
    {
        var done = new HashSet<string> { "ai-engineering" };
        Assert.True(AchievementRules.IsSatisfied(A(AchievementRuleType.RoadmapCompleted, 1, "ai-engineering"), Ctx(roadmaps: done)));
        Assert.True(AchievementRules.IsSatisfied(A(AchievementRuleType.RoadmapsCompleted, 1), Ctx(roadmaps: done)));
        Assert.False(AchievementRules.IsSatisfied(A(AchievementRuleType.RoadmapsCompleted, 2), Ctx(roadmaps: done)));
    }

    [Fact]
    public void Rank_rules_need_minimum_xp()
    {
        var top10 = A(AchievementRuleType.GlobalRank, 10, secondary: 2000);
        Assert.False(AchievementRules.IsSatisfied(top10, Ctx(rank: 1, xp: 50)));
        Assert.True(AchievementRules.IsSatisfied(top10, Ctx(rank: 10, xp: 2000)));
        Assert.False(AchievementRules.IsSatisfied(top10, Ctx(rank: 11, xp: 5000)));
    }
}
