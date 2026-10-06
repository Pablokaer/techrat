using TechRat.Domain.Common;

namespace TechRat.Application.Roadmaps;

/// <summary>
/// Roadmaps are the structured path (ADR-0014): inside a module, steps get gradually harder. The first half of a
/// module's steps sits at the level's entry difficulty (Beginner → Easy, Intermediate → Medium, Advanced → Hard,
/// Expert → Expert) and the second half one difficulty above, so a module never jumps and the next level starts where
/// the previous one ended. Step practice sessions also present their questions easiest first.
/// </summary>
public static class DifficultyRamp
{
    public static Difficulty StepDifficulty(RoadmapDifficulty level, int index, int count)
    {
        var entry = level switch
        {
            RoadmapDifficulty.Beginner => Difficulty.Easy,
            RoadmapDifficulty.Intermediate => Difficulty.Medium,
            RoadmapDifficulty.Advanced => Difficulty.Hard,
            _ => Difficulty.Expert,
        };
        var position = count <= 1 ? 0 : (double)index / (count - 1);
        return position >= 0.5 && entry < Difficulty.Expert ? entry + 1 : entry;
    }
}
