using TechRat.Domain.Common;

namespace TechRat.Application.Practice;

public sealed record DifficultyStats(int Answered, int Correct)
{
    public double Accuracy => Answered == 0 ? 0 : 100.0 * Correct / Answered;
}

/// <summary>
/// Simple rule-based adaptive policy (no ML): shifts the difficulty mix based on per-difficulty accuracy.
/// Rules only fire after enough evidence (<see cref="MinEvidence"/> answers at that difficulty).
/// </summary>
public static class AdaptiveDifficultyPolicy
{
    public const int MinEvidence = 5;

    public static IReadOnlyDictionary<Difficulty, int> Weights(IReadOnlyDictionary<Difficulty, DifficultyStats> stats)
    {
        var w = new Dictionary<Difficulty, int>
        {
            [Difficulty.Easy] = 4, [Difficulty.Medium] = 4, [Difficulty.Hard] = 2, [Difficulty.Expert] = 0,
        };
        DifficultyStats S(Difficulty d) => stats.TryGetValue(d, out var s) ? s : new DifficultyStats(0, 0);
        bool Known(Difficulty d) => S(d).Answered >= MinEvidence;

        // Mastered the basics: fewer Easy questions.
        if (Known(Difficulty.Easy) && S(Difficulty.Easy).Accuracy > 85) { w[Difficulty.Easy] = 1; w[Difficulty.Medium] += 1; w[Difficulty.Hard] += 1; }
        // Comfortable at Medium: more Hard (and introduce Expert).
        if (Known(Difficulty.Medium) && S(Difficulty.Medium).Accuracy > 75) { w[Difficulty.Hard] += 3; w[Difficulty.Expert] += 1; w[Difficulty.Medium] -= 1; }
        // Struggling at Hard: keep the mix on Medium and Hard, no Expert.
        if (Known(Difficulty.Hard) && S(Difficulty.Hard).Accuracy < 50) { w[Difficulty.Medium] += 2; w[Difficulty.Expert] = 0; }
        // Strong at Hard: unlock more Expert.
        if (Known(Difficulty.Hard) && S(Difficulty.Hard).Accuracy >= 75) w[Difficulty.Expert] += 2;
        // Struggling with Easy: stay on fundamentals.
        if (Known(Difficulty.Easy) && S(Difficulty.Easy).Accuracy < 60) { w[Difficulty.Easy] += 3; w[Difficulty.Hard] = 1; w[Difficulty.Expert] = 0; }

        foreach (var k in w.Keys.ToList()) w[k] = Math.Max(0, w[k]);
        return w;
    }

    /// <summary>Splits <paramref name="count"/> across difficulties proportionally to weights (largest remainder).</summary>
    public static Dictionary<Difficulty, int> Allocate(IReadOnlyDictionary<Difficulty, int> weights, int count)
    {
        var total = weights.Values.Sum();
        if (total == 0) return new() { [Difficulty.Medium] = count };
        var exact = weights.ToDictionary(k => k.Key, k => (double)k.Value * count / total);
        var result = exact.ToDictionary(k => k.Key, k => (int)Math.Floor(k.Value));
        var remaining = count - result.Values.Sum();
        foreach (var k in exact.OrderByDescending(k => k.Value - Math.Floor(k.Value)).ThenBy(k => k.Key).Take(remaining))
            result[k.Key]++;
        return result;
    }
}

public sealed record CandidateQuestion(Guid Id, Difficulty Difficulty, Guid TopicId);

/// <summary>Pure selection logic so it can be unit tested without a database.</summary>
public static class QuestionPicker
{
    /// <summary>
    /// Ordering preference: never-seen questions first, then questions whose latest attempt was wrong, then the rest.
    /// Randomised inside each bucket.
    /// </summary>
    public static List<CandidateQuestion> Prioritise(IEnumerable<CandidateQuestion> candidates, IReadOnlyDictionary<Guid, bool> latestCorrectness, Random rng) =>
        candidates
            .Select(c => (c, bucket: !latestCorrectness.TryGetValue(c.Id, out var ok) ? 0 : ok ? 2 : 1, r: rng.Next()))
            .OrderBy(x => x.bucket).ThenBy(x => x.r)
            .Select(x => x.c).ToList();

    /// <summary>
    /// Practice, Challenge and Random sessions: a new random draw every time, in random order (no easy-first ramp).
    /// To avoid repeats, questions never shown to the learner come first, then questions shown in older sessions, and
    /// questions from the most recent sessions only when the pool runs out. "Shown" counts every question placed in a
    /// session, answered or not, so abandoning a session does not bring the same questions back.
    /// </summary>
    public static List<Guid> PickFresh(IEnumerable<CandidateQuestion> candidates, IReadOnlySet<Guid> shownBefore, IReadOnlySet<Guid> shownRecently, int count, Random rng)
    {
        var picked = candidates
            .Select(c => (c.Id, bucket: shownRecently.Contains(c.Id) ? 2 : shownBefore.Contains(c.Id) ? 1 : 0, r: rng.Next()))
            .OrderBy(x => x.bucket).ThenBy(x => x.r)
            .Take(count)
            .Select(x => x.Id)
            .ToArray();
        rng.Shuffle(picked);
        return [.. picked];
    }

    public static List<Guid> PickByAllocation(List<CandidateQuestion> prioritised, Dictionary<Difficulty, int> allocation, int count)
    {
        var picked = new List<CandidateQuestion>();
        foreach (var (difficulty, n) in allocation)
            picked.AddRange(prioritised.Where(c => c.Difficulty == difficulty).Take(n));
        // Backfill when a difficulty pool was too small.
        if (picked.Count < count)
            picked.AddRange(prioritised.Where(c => !picked.Contains(c)).Take(count - picked.Count));
        // Present easier questions first for a smoother ramp.
        return picked.Take(count).OrderBy(c => c.Difficulty).Select(c => c.Id).ToList();
    }
}
