namespace TechRat.Domain.Gamification;

/// <summary>Result of evaluating where a total XP amount lands on the level curve.</summary>
public readonly record struct LevelInfo(
    int Level,
    long TotalXp,
    long XpIntoLevel,
    long XpForThisLevel,
    long XpToNextLevel,
    long TotalXpForNextLevel,
    double ProgressPercent);

/// <summary>
/// Progressive curve: finishing level L costs Base + Increment * (L - 1) XP.
/// With the defaults (100, 50) the cumulative thresholds are 100, 250, 450, 700, 1000 ...
/// </summary>
public sealed class LevelCurve
{
    public LevelCurve(int baseXp = 100, int incrementXp = 50, int maxLevel = 100)
    {
        if (baseXp <= 0) throw new ArgumentOutOfRangeException(nameof(baseXp));
        if (incrementXp < 0) throw new ArgumentOutOfRangeException(nameof(incrementXp));
        if (maxLevel < 1) throw new ArgumentOutOfRangeException(nameof(maxLevel));
        BaseXp = baseXp;
        IncrementXp = incrementXp;
        MaxLevel = maxLevel;
    }

    public int BaseXp { get; }
    public int IncrementXp { get; }
    public int MaxLevel { get; }

    /// <summary>XP needed to complete <paramref name="level"/> (go from level to level + 1).</summary>
    public long XpForLevel(int level) => BaseXp + (long)IncrementXp * (level - 1);

    /// <summary>Total XP required to reach <paramref name="level"/>. Level 1 requires 0.</summary>
    public long TotalXpToReach(int level)
    {
        if (level <= 1) return 0;
        long n = level - 1;
        return BaseXp * n + IncrementXp * n * (n - 1) / 2;
    }

    public LevelInfo Evaluate(long totalXp)
    {
        if (totalXp < 0) totalXp = 0;
        var level = 1;
        while (level < MaxLevel && totalXp >= TotalXpToReach(level + 1)) level++;

        var start = TotalXpToReach(level);
        if (level == MaxLevel)
            return new LevelInfo(level, totalXp, totalXp - start, 0, 0, start, 100);

        var span = XpForLevel(level);
        var into = totalXp - start;
        return new LevelInfo(level, totalXp, into, span, span - into, start + span,
            Math.Round(100.0 * into / span, 1));
    }
}

public static class StreakRules
{
    /// <summary>
    /// Applies activity on <paramref name="today"/> (UTC date) and returns the new streak values.
    /// Same day: unchanged. Next consecutive day: +1. Any gap: restart at 1.
    /// </summary>
    public static (int Current, int Longest, bool IncrementedToday) Apply(
        DateOnly? lastActivity, int current, int longest, DateOnly today)
    {
        if (lastActivity == today) return (Math.Max(current, 1), Math.Max(longest, Math.Max(current, 1)), false);
        var next = lastActivity == today.AddDays(-1) ? current + 1 : 1;
        return (next, Math.Max(longest, next), true);
    }

    /// <summary>The streak shown to a user: it is broken if they missed yesterday and haven't played today.</summary>
    public static int Effective(DateOnly? lastActivity, int current, DateOnly today) =>
        lastActivity is { } d && (d == today || d == today.AddDays(-1)) ? current : 0;
}
