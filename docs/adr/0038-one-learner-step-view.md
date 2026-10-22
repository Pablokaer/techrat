# ADR-0038: One place builds a learner's steps for roadmaps and modules

**Status:** Accepted · Builds on ADR-0012 (reusable module catalog); its progress rules are unchanged

## Context

A module's steps appear on two pages: the roadmap page (`GET /roadmaps/{slug}`, every module of the roadmap) and the
module page (`GET /modules/{slug}`). `RoadmapService` and `ModuleService` each assembled the steps themselves: the step
query with its topic and subtopic, the progress snapshot, the administrator rule, the status (Completed / Current /
Locked), the "new content" flag, the criteria of open steps and the translated texts. The two copies had already drifted:

- A module completed before a step was added to it (ADR-0012, versioning) showed that new step as **Current** on the
  module page but **Locked** on the roadmap page, because the roadmap only opened the next step of *open* modules and a
  completed module is not open. The progress engine (`AdvanceAsync`) does evaluate started modules, so the step was
  workable and the roadmap page was wrong.
- "New content" was written twice with different conditions (the same intent, by luck the same result today).

The pure rules were unit-tested, but the assembly was only reached by integration tests, so a drift like this was easy to
introduce and hard to see. The roadmap unlock rule had the same shape: three call sites, one of them an inline
`pct >= minimum`.

## Decision

- **`LearnerSteps`** (`Application/Roadmaps/LearnerSteps.cs`) is the only code that turns module steps into
  `RoadmapStepDto`s. Given the modules (one module, or a roadmap's links), the learner (or an anonymous visitor) and
  whether they are an administrator, it returns the ready steps per module plus the snapshot it used. `RoadmapService`
  and `ModuleService` only compose it with their own module- and roadmap-level data.
- Its decisions are pure functions in **`LearnerStepRules`**, unit-tested:
  - *Workable modules* of a roadmap: the open modules (ADR-0012 rule 2) **plus every module of the roadmap the learner
    already started**, which is what `AdvanceAsync` evaluates. On the module page the module itself is workable.
  - *Open steps*: the next uncompleted step of each workable module; administrators have every uncompleted step open.
  - *Status*: Completed if completed (permanent), Current if open, otherwise Locked.
  - *New*: the step was added in a version later than the one the learner completed; nothing is new before completion.
- Steps and modules use **one status set** (`StepStatus`); the separate `ModuleStatus` constants are gone.
- **`RoadmapUnlock.IsMet`** decides one prerequisite; `RoadmapUnlock.IsUnlocked` (with the administrator bypass) uses it,
  and the catalog cards, the prerequisite list of the detail page and enrolment (`IsUnlockedAsync`) all go through them.
- The API contract does not change.

## Consequences

- For the same learner, a step looks the same on the roadmap page and on the module page whenever its module is workable
  in the roadmap; an integration test (`StepViewTests`) compares both pages field by field, for a learner with new
  content and for an administrator. The one intended difference stays: a module the roadmap has not reached yet (and the
  learner has not started) is Locked on the roadmap page but Current on its own page, since outside a roadmap only step
  order gates it.
- Behaviour change: on the roadmap page (and so the dashboard's "current steps"), a step added to a module the learner had
  already completed now shows as Current instead of Locked. The module stays Completed, progress and XP are unchanged.
- A new rule about how steps are shown has one place to go, and its unit tests cover it without a database.
