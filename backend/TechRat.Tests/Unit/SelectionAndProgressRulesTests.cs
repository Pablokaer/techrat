using TechRat.Application.Analytics;
using TechRat.Application.Leaderboards;
using TechRat.Application.Practice;
using TechRat.Application.Roadmaps;
using TechRat.Domain.Common;

namespace TechRat.Tests.Unit;

public class StepCriteriaTests
{
    [Fact]
    public void Requires_minimum_distinct_questions()
    {
        var r = StepCriteria.Evaluate([true, true, true, true], minQuestions: 5, minAccuracy: 70);
        Assert.False(r.IsMet);
        Assert.Equal(4, r.AnsweredQuestions);
    }

    [Fact]
    public void Requires_minimum_accuracy()
    {
        Assert.False(StepCriteria.Evaluate([true, true, true, false, false], 5, 70).IsMet); // 60%
        Assert.True(StepCriteria.Evaluate([true, true, true, true, false], 5, 70).IsMet);   // 80%
    }

    [Fact]
    public void Exact_threshold_counts() => Assert.True(StepCriteria.Evaluate([true, true, true, true, true, true, true, false, false, false], 10, 70).IsMet);

    [Fact]
    public void Opening_a_step_without_answers_never_completes_it() => Assert.False(StepCriteria.Evaluate([], 0, 0).IsMet);

    [Fact]
    public void Unlock_requires_every_dependency()
    {
        Assert.True(RoadmapUnlock.IsUnlocked([]));
        Assert.True(RoadmapUnlock.IsUnlocked([(50, 50), (30, 90)]));
        Assert.False(RoadmapUnlock.IsUnlocked([(50, 49.9), (30, 90)]));
    }
}

public class DifficultyRampTests
{
    [Theory]
    [InlineData(RoadmapDifficulty.Beginner, 3, new[] { Difficulty.Easy, Difficulty.Medium, Difficulty.Medium })]
    [InlineData(RoadmapDifficulty.Intermediate, 4, new[] { Difficulty.Medium, Difficulty.Medium, Difficulty.Hard, Difficulty.Hard })]
    [InlineData(RoadmapDifficulty.Advanced, 2, new[] { Difficulty.Hard, Difficulty.Expert })]
    [InlineData(RoadmapDifficulty.Beginner, 1, new[] { Difficulty.Easy })]
    [InlineData(RoadmapDifficulty.Expert, 2, new[] { Difficulty.Expert, Difficulty.Expert })]
    public void Steps_in_a_module_ramp_up_from_the_level_entry_difficulty(RoadmapDifficulty level, int steps, Difficulty[] expected) =>
        Assert.Equal(expected, Enumerable.Range(0, steps).Select(i => DifficultyRamp.StepDifficulty(level, i, steps)));

    [Fact]
    public void The_ramp_never_goes_down_within_a_module_or_between_levels()
    {
        foreach (var level in Enum.GetValues<RoadmapDifficulty>())
            for (var count = 1; count <= 8; count++)
            {
                var ramp = Enumerable.Range(0, count).Select(i => DifficultyRamp.StepDifficulty(level, i, count)).ToList();
                Assert.Equal(ramp.Order(), ramp);
            }
        var levels = Enum.GetValues<RoadmapDifficulty>().OrderBy(l => l).ToList();
        foreach (var (easier, harder) in levels.Zip(levels.Skip(1)))
        {
            Assert.True(DifficultyRamp.StepDifficulty(easier, 0, 3) <= DifficultyRamp.StepDifficulty(harder, 0, 3));
            Assert.True(DifficultyRamp.StepDifficulty(easier, 2, 3) <= DifficultyRamp.StepDifficulty(harder, 2, 3));
        }
    }
}

public class AdaptiveDifficultyPolicyTests
{
    private static Dictionary<Difficulty, DifficultyStats> Stats(params (Difficulty d, int answered, int correct)[] s) =>
        s.ToDictionary(x => x.d, x => new DifficultyStats(x.answered, x.correct));

    [Fact]
    public void New_learners_get_mostly_easy_and_medium()
    {
        var w = AdaptiveDifficultyPolicy.Weights(Stats());
        Assert.True(w[Difficulty.Easy] + w[Difficulty.Medium] > w[Difficulty.Hard] + w[Difficulty.Expert]);
        Assert.Equal(0, w[Difficulty.Expert]);
    }

    [Fact]
    public void High_easy_accuracy_reduces_easy()
    {
        var w = AdaptiveDifficultyPolicy.Weights(Stats((Difficulty.Easy, 20, 19)));
        Assert.Equal(1, w[Difficulty.Easy]);
    }

    [Fact]
    public void High_medium_accuracy_increases_hard()
    {
        var baseline = AdaptiveDifficultyPolicy.Weights(Stats());
        var w = AdaptiveDifficultyPolicy.Weights(Stats((Difficulty.Medium, 20, 18)));
        Assert.True(w[Difficulty.Hard] > baseline[Difficulty.Hard]);
        Assert.True(w[Difficulty.Expert] > 0);
    }

    [Fact]
    public void Low_hard_accuracy_keeps_medium_and_hard_without_expert()
    {
        var w = AdaptiveDifficultyPolicy.Weights(Stats((Difficulty.Medium, 20, 18), (Difficulty.Hard, 10, 3)));
        Assert.Equal(0, w[Difficulty.Expert]);
        Assert.True(w[Difficulty.Medium] + w[Difficulty.Hard] >= 6);
    }

    [Fact]
    public void Rules_ignore_small_samples()
    {
        var w = AdaptiveDifficultyPolicy.Weights(Stats((Difficulty.Easy, 3, 3)));
        Assert.Equal(AdaptiveDifficultyPolicy.Weights(Stats())[Difficulty.Easy], w[Difficulty.Easy]);
    }

    [Theory]
    [InlineData(10)]
    [InlineData(7)]
    [InlineData(1)]
    public void Allocation_sums_to_count(int count)
    {
        var allocation = AdaptiveDifficultyPolicy.Allocate(AdaptiveDifficultyPolicy.Weights(Stats()), count);
        Assert.Equal(count, allocation.Values.Sum());
    }
}

public class QuestionPickerTests
{
    private static CandidateQuestion Q(int n, Difficulty d = Difficulty.Easy) => new(new Guid(n, 0, 0, new byte[8]), d, Guid.Empty);

    [Fact]
    public void Unseen_questions_come_first_then_wrong_then_correct()
    {
        var unseen = Q(1); var wrong = Q(2); var right = Q(3);
        var latest = new Dictionary<Guid, bool> { [wrong.Id] = false, [right.Id] = true };
        var ordered = QuestionPicker.Prioritise([right, wrong, unseen], latest, new Random(1));
        Assert.Equal([unseen, wrong, right], ordered);
    }

    [Fact]
    public void Fresh_draw_prefers_never_shown_then_shown_long_ago_then_shown_recently()
    {
        var never = Q(1); var longAgo = Q(2); var recent = Q(3);
        var shown = new HashSet<Guid> { longAgo.Id, recent.Id };
        var recentlyShown = new HashSet<Guid> { recent.Id };
        for (var seed = 0; seed < 20; seed++)
        {
            Assert.Equal([never.Id], QuestionPicker.PickFresh([recent, longAgo, never], shown, recentlyShown, 1, new Random(seed)));
            Assert.Equal(
                new HashSet<Guid> { never.Id, longAgo.Id },
                QuestionPicker.PickFresh([recent, longAgo, never], shown, recentlyShown, 2, new Random(seed)).ToHashSet());
        }
    }

    [Fact]
    public void Questions_shown_but_never_answered_are_not_drawn_again_while_others_remain()
    {
        var pool = Enumerable.Range(1, 6).Select(i => Q(i)).ToList();
        var shownLastTime = pool.Take(3).Select(q => q.Id).ToHashSet(); // e.g. a session abandoned after one answer
        var next = QuestionPicker.PickFresh(pool, shownLastTime, shownLastTime, 3, new Random(7));
        Assert.Equal(pool.Skip(3).Select(q => q.Id).ToHashSet(), next.ToHashSet());
    }

    [Fact]
    public void Fresh_draw_is_random_in_choice_and_order_not_easy_first()
    {
        var pool = Enumerable.Range(1, 40).Select(i => Q(i, (Difficulty)(i % 4 + 1))).ToList();
        var draws = Enumerable.Range(0, 10)
            .Select(seed => QuestionPicker.PickFresh(pool, new HashSet<Guid>(), new HashSet<Guid>(), 10, new Random(seed)))
            .ToList();
        Assert.All(draws, d => Assert.Equal(10, d.Distinct().Count()));
        Assert.True(draws.Select(d => d[0]).Distinct().Count() > 5, "the first question should vary between sessions");
        Assert.True(draws.Select(d => string.Join(",", d.Order())).Distinct().Count() > 5, "the chosen set should vary between sessions");
        var difficulty = pool.ToDictionary(q => q.Id, q => q.Difficulty);
        Assert.Contains(draws, d => !d.Select(id => difficulty[id]).SequenceEqual(d.Select(id => difficulty[id]).Order()));
    }

    [Fact]
    public void Fresh_draw_returns_the_whole_pool_when_it_is_smaller_than_the_session()
    {
        var pool = Enumerable.Range(1, 4).Select(i => Q(i)).ToList();
        var picked = QuestionPicker.PickFresh(pool, pool.Select(q => q.Id).ToHashSet(), pool.Select(q => q.Id).ToHashSet(), 10, new Random(1));
        Assert.Equal(pool.Select(q => q.Id).ToHashSet(), picked.ToHashSet());
    }

    [Fact]
    public void Allocation_backfills_when_a_difficulty_is_short()
    {
        var pool = new List<CandidateQuestion> { Q(1, Difficulty.Easy), Q(2, Difficulty.Easy), Q(3, Difficulty.Medium) };
        var picked = QuestionPicker.PickByAllocation(pool, new() { [Difficulty.Hard] = 3 }, 3);
        Assert.Equal(3, picked.Count);
        Assert.Equal(3, picked.Distinct().Count());
    }

    [Fact]
    public void Daily_challenge_is_deterministic_and_mixes_topics()
    {
        var pool = Enumerable.Range(1, 60).Select(i => new CandidateQuestion(new Guid(i, 0, 0, new byte[8]), (Difficulty)(i % 3 + 1), new Guid(i % 12, 0, 0, new byte[8]))).ToList();
        var day = new DateOnly(2026, 10, 5);
        var a = DailyChallengeService.Pick(pool, day, 5);
        var b = DailyChallengeService.Pick(pool, day, 5);
        Assert.Equal(a, b);
        Assert.Equal(5, a.Count);
        Assert.Equal(5, pool.Where(q => a.Contains(q.Id)).Select(q => q.TopicId).Distinct().Count());
        Assert.NotEqual(a, DailyChallengeService.Pick(pool, day.AddDays(1), 5));
    }
}

public class LeaderboardRulesTests
{
    [Fact]
    public void Ties_share_rank_competition_style() =>
        Assert.Equal([1, 2, 2, 4], LeaderboardPeriods.CompetitionRanks([500, 300, 300, 100]));

    [Fact]
    public void Page_offset_and_cross_page_ties()
    {
        Assert.Equal([21, 22], LeaderboardPeriods.CompetitionRanks([90, 80], offsetRank: 21));
        Assert.Equal([19, 19, 23], LeaderboardPeriods.CompetitionRanks([90, 90, 80], offsetRank: 21, previousScore: 90, previousRank: 19));
    }

    [Fact]
    public void Week_starts_monday_utc()
    {
        var sunday = new DateTimeOffset(2026, 10, 11, 23, 0, 0, TimeSpan.Zero);
        Assert.Equal(new DateTimeOffset(2026, 10, 5, 0, 0, 0, TimeSpan.Zero), LeaderboardPeriods.WeekStart(sunday));
        Assert.Equal(new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero), LeaderboardPeriods.MonthStart(sunday));
    }

    [Fact]
    public void Strongest_and_weakest_topics_need_evidence()
    {
        var topics = new List<TopicAccuracyDto>
        {
            new("a", "A", 10, 9, 90), new("b", "B", 10, 4, 40), new("c", "C", 3, 0, 0), new("d", "D", 20, 14, 70),
            new("e", "E", 8, 2, 25),
        };
        var (strong, weak) = TopicStrength.Classify(topics, take: 2);
        Assert.Equal(["a", "d"], strong.Select(t => t.Slug));
        Assert.Equal(["e", "b"], weak.Select(t => t.Slug));
        Assert.DoesNotContain(weak, t => t.Slug == "c");
    }
}
