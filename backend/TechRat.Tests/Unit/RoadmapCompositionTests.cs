using TechRat.Application.Roadmaps;
using TechRat.Domain.Roadmaps;

namespace TechRat.Tests.Unit;

public class RoadmapCompositionTests
{
    private static readonly Guid R = Guid.NewGuid();
    private static readonly Guid A = Guid.NewGuid(), B = Guid.NewGuid(), C = Guid.NewGuid(), Opt = Guid.NewGuid();

    private static List<RoadmapLink> Links(bool optional = false) =>
    [
        new(R, A, 1, true), new(R, Opt, 2, !optional), new(R, B, 3, true), new(R, C, 4, true),
    ];

    private static HashSet<Guid> Set(params Guid[] ids) => [.. ids];

    [Fact]
    public void Only_the_first_uncompleted_required_module_is_open()
    {
        var links = new List<RoadmapLink> { new(R, A, 1, true), new(R, B, 2, true), new(R, C, 3, true) };
        Assert.Equal([A], RoadmapComposition.OpenModules(links, Set(), Set()));
        Assert.Equal([B], RoadmapComposition.OpenModules(links, Set(A), Set()));
        Assert.Empty(RoadmapComposition.OpenModules(links, Set(A, B, C), Set()));
    }

    [Fact]
    public void A_module_completed_elsewhere_counts_and_unlocks_the_next_one()
    {
        var links = new List<RoadmapLink> { new(R, A, 1, true), new(R, B, 2, true), new(R, C, 3, true) };
        // B was completed through another roadmap: A is still current, B is done, C waits for A.
        Assert.Equal([A], RoadmapComposition.OpenModules(links, Set(B), Set(B)));
        Assert.Equal([C], RoadmapComposition.OpenModules(links, Set(A, B), Set(A, B)));
    }

    [Fact]
    public void A_required_module_already_started_elsewhere_is_open_out_of_order()
    {
        var links = new List<RoadmapLink> { new(R, A, 1, true), new(R, B, 2, true), new(R, C, 3, true) };
        Assert.Equal([A, C], RoadmapComposition.OpenModules(links, Set(), Set(C)));
    }

    [Fact]
    public void Optional_modules_are_open_and_never_block()
    {
        var links = Links(optional: true);
        Assert.Equal([A, Opt], RoadmapComposition.OpenModules(links, Set(), Set()));
        Assert.Equal([Opt, B], RoadmapComposition.OpenModules(links, Set(A), Set()));
        Assert.True(RoadmapComposition.IsCompleted(links, Set(A, B, C)));
        Assert.False(RoadmapComposition.IsCompleted(links, Set(A, B, Opt)));
    }

    [Fact]
    public void Progress_counts_required_modules_only()
    {
        var links = Links(optional: true);
        var steps = new Dictionary<Guid, int> { [A] = 2, [Opt] = 10, [B] = 4, [C] = 4 };
        var done = new Dictionary<Guid, int> { [A] = 2, [Opt] = 10, [B] = 1 };
        var (completed, total, percent) = RoadmapComposition.Progress(links, steps, done, Set(A, Opt));
        Assert.Equal((3, 10, 30.0), (completed, total, percent));
    }

    [Fact]
    public void A_completed_module_stays_complete_when_steps_are_added_later()
    {
        var links = new List<RoadmapLink> { new(R, A, 1, true), new(R, B, 2, true) };
        // A gained a third step after the learner completed it (version 2): it still counts as fully done.
        var steps = new Dictionary<Guid, int> { [A] = 3, [B] = 2 };
        var done = new Dictionary<Guid, int> { [A] = 2 };
        var (completed, total, _) = RoadmapComposition.Progress(links, steps, done, Set(A));
        Assert.Equal((3, 5), (completed, total));
        Assert.Equal([B], RoadmapComposition.OpenModules(links, Set(A), Set(A)));
    }

    [Fact]
    public void Steps_inside_a_module_unlock_in_order()
    {
        var s1 = new ModuleStep { Title = "1", Order = 1 };
        var s2 = new ModuleStep { Title = "2", Order = 2 };
        var s3 = new ModuleStep { Title = "3", Order = 3 };
        ModuleStep[] steps = [s3, s1, s2];
        Assert.Same(s1, RoadmapComposition.CurrentStep(steps, Set()));
        Assert.Same(s2, RoadmapComposition.CurrentStep(steps, Set(s1.Id)));
        Assert.Null(RoadmapComposition.CurrentStep(steps, Set(s1.Id, s2.Id, s3.Id)));
    }

    [Fact]
    public void An_empty_roadmap_has_zero_progress()
    {
        Assert.Equal((0, 0, 0.0), RoadmapComposition.Progress([], new Dictionary<Guid, int>(), new Dictionary<Guid, int>(), Set()));
    }
}
