using Microsoft.Extensions.Options;
using TechRat.Application.Common;
using TechRat.Domain.Gamification;

namespace TechRat.Application.Gamification;

/// <summary>Single source of truth for XP → level conversion (global and per-topic levels use the same curve).</summary>
public sealed class LevelService(IOptions<GamificationOptions> options)
{
    private readonly LevelCurve _curve = new(options.Value.LevelBaseXp, options.Value.LevelIncrementXp, options.Value.MaxLevel);

    public LevelInfo Evaluate(long totalXp) => _curve.Evaluate(totalXp);
    public int LevelFor(long totalXp) => _curve.Evaluate(totalXp).Level;
    public long TotalXpToReach(int level) => _curve.TotalXpToReach(level);
}

public sealed record LevelDto(int Level, long TotalXp, long XpIntoLevel, long XpForThisLevel, long XpToNextLevel, double ProgressPercent)
{
    public static LevelDto From(LevelInfo i) => new(i.Level, i.TotalXp, i.XpIntoLevel, i.XpForThisLevel, i.XpToNextLevel, i.ProgressPercent);
}
