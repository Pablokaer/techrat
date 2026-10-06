using TechRat.Application.Practice;

namespace TechRat.Tests.Unit;

/// <summary>
/// Answer options are shown in a random order per session, so learners learn the content and not the position of the
/// correct answer. "All/None of the above" keep their place.
/// </summary>
public class OptionShuffleTests
{
    private static readonly string[] Plain = ["Alpha", "Bravo", "Charlie", "Delta"];

    [Fact]
    public void Keeps_every_option_exactly_once()
    {
        for (var seed = 0; seed < 200; seed++)
        {
            var order = OptionShuffle.Order(Plain, o => o, seed);
            Assert.Equal(Plain.Order(), order.Order());
        }
    }

    [Fact]
    public void The_same_seed_gives_the_same_order_so_a_question_keeps_its_order_on_reload()
    {
        Assert.Equal(OptionShuffle.Order(Plain, o => o, 42), OptionShuffle.Order(Plain, o => o, 42));
    }

    [Fact]
    public void Every_order_is_about_equally_likely()
    {
        // 24 permutations of 4 options; with 24,000 draws each should appear ~1,000 times.
        const int draws = 24_000;
        var counts = Enumerable.Range(0, draws)
            .Select(seed => string.Join(",", OptionShuffle.Order(Plain, o => o, OptionShuffle.Seed(Guid.NewGuid(), Guid.NewGuid()))))
            .GroupBy(k => k).ToDictionary(g => g.Key, g => g.Count());

        Assert.Equal(24, counts.Count);
        // Chi-square with 23 degrees of freedom: p = 0.001 at 49.7, so a fair shuffle stays well below 60.
        var expected = draws / 24.0;
        var chiSquare = counts.Values.Sum(c => (c - expected) * (c - expected) / expected);
        Assert.True(chiSquare < 60, $"chi-square {chiSquare:F1}");
    }

    [Fact]
    public void The_correct_answer_lands_in_each_position_about_a_quarter_of_the_time()
    {
        var positions = new int[4];
        for (var i = 0; i < 8_000; i++)
            positions[Array.IndexOf(OptionShuffle.Order(Plain, o => o, OptionShuffle.Seed(Guid.NewGuid(), Guid.NewGuid())), "Alpha")]++;
        Assert.All(positions, p => Assert.InRange(p, 1_800, 2_200));
    }

    [Theory]
    [InlineData("All of the above")]
    [InlineData("None of the above")]
    [InlineData("all of the above.")]
    [InlineData("Todas as anteriores")]
    [InlineData("Nenhuma das anteriores")]
    [InlineData("Both A and B")]
    public void All_or_none_of_the_above_keep_their_position(string pinned)
    {
        string[] options = ["Alpha", "Bravo", "Charlie", pinned];
        for (var seed = 0; seed < 200; seed++)
        {
            var order = OptionShuffle.Order(options, o => o, seed);
            Assert.Equal(pinned, order[3]);
            Assert.Equal(options.Order(), order.Order());
        }
    }

    [Fact]
    public void The_seed_differs_between_sessions_and_between_questions()
    {
        var session = Guid.NewGuid();
        var question = Guid.NewGuid();
        Assert.Equal(OptionShuffle.Seed(session, question), OptionShuffle.Seed(session, question));
        Assert.NotEqual(OptionShuffle.Seed(session, question), OptionShuffle.Seed(Guid.NewGuid(), question));
        Assert.NotEqual(OptionShuffle.Seed(session, question), OptionShuffle.Seed(session, Guid.NewGuid()));
    }
}
