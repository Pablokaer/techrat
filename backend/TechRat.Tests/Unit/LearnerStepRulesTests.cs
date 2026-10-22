using TechRat.Application.Roadmaps;
using TechRat.Domain.Roadmaps;

namespace TechRat.Tests.Unit;

/// <summary>
/// The rules both the roadmap page and the module page use to show a learner's steps (status and "new content").
/// </summary>
public class LearnerStepRulesTests
{
    private static readonly Guid R = Guid.NewGuid();
    private static readonly Guid A = Guid.NewGuid(), B = Guid.NewGuid(), C = Guid.NewGuid();

    private static HashSet<Guid> Set(params Guid[] ids) => [.. ids];

    private static ModuleStep Step(Guid module, int order, int addedIn = 1) =>
        new() { ModuleId = module, Order = order, Title = $"{order}", AddedInVersion = addedIn };

    [Fact]
    public void In_a_roadmap_a_completed_module_that_gained_a_step_stays_workable()
    {
        var links = new List<RoadmapLink> { new(R, A, 1, true), new(R, B, 2, true), new(R, C, 3, true) };
        // A was completed (so it is started), B is the first uncompleted required module, C waits.
        Assert.Equal(Set(A, B), LearnerStepRules.WorkableModules(links, Set(A), Set(A)));
        // A module started elsewhere but outside the roadmap is not part of it.
        Assert.Equal(Set(B), LearnerStepRules.WorkableModules(links.Skip(1), Set(A), Set(A)));
    }

    [Fact]
    public void Only_the_next_step_of_each_workable_module_is_open()
    {
        var a1 = Step(A, 1); var a2 = Step(A, 2); var b1 = Step(B, 1);
        Assert.Equal(Set(a1.Id), LearnerStepRules.OpenSteps([a2, a1, b1], Set(A), Set(), isAdmin: false));
        Assert.Equal(Set(a2.Id), LearnerStepRules.OpenSteps([a1, a2, b1], Set(A), Set(a1.Id), isAdmin: false));
    }

    [Fact]
    public void Administrators_have_every_uncompleted_step_open()
    {
        var a1 = Step(A, 1); var a2 = Step(A, 2); var b1 = Step(B, 1);
        Assert.Equal(Set(a2.Id, b1.Id), LearnerStepRules.OpenSteps([a1, a2, b1], Set(), Set(a1.Id), isAdmin: true));
    }

    [Fact]
    public void Status_is_completed_then_current_then_locked()
    {
        var done = Guid.NewGuid(); var open = Guid.NewGuid(); var later = Guid.NewGuid();
        Assert.Equal(StepStatus.Completed, LearnerStepRules.Status(done, Set(done), Set(done, open)));
        Assert.Equal(StepStatus.Current, LearnerStepRules.Status(open, Set(done), Set(open)));
        Assert.Equal(StepStatus.Locked, LearnerStepRules.Status(later, Set(done), Set(open)));
    }

    [Fact]
    public void A_step_is_new_only_when_added_after_the_learner_completed_the_module()
    {
        var original = Step(A, 1, addedIn: 1);
        var added = Step(A, 2, addedIn: 2);
        var completedV1 = new UserModuleProgress { ModuleId = A, CompletedAt = DateTimeOffset.UtcNow, CompletedVersion = 1 };
        Assert.False(LearnerStepRules.IsNew(original, completedV1));
        Assert.True(LearnerStepRules.IsNew(added, completedV1));
        // Not completed (or never started): nothing is "new" yet, the learner simply has not reached it.
        Assert.False(LearnerStepRules.IsNew(added, new UserModuleProgress { ModuleId = A }));
        Assert.False(LearnerStepRules.IsNew(added, null));
        // Completed on the current version: nothing is new.
        Assert.False(LearnerStepRules.IsNew(added, new UserModuleProgress { ModuleId = A, CompletedAt = DateTimeOffset.UtcNow, CompletedVersion = 2 }));
    }
}
