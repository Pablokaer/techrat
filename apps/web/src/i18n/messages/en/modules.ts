/** Reusable learning modules: a module completed once counts in every roadmap that contains it. */
export const modules = {
  /** Labels for `ModuleKind` values from the API. */
  kind: {
    Core: "Core",
    Context: "Context",
    BestPractices: "Best practices",
    Capstone: "Capstone",
  } as Record<string, string>,
  /** Labels for module status values from the API. */
  status: {
    Completed: "Completed",
    Current: "In progress",
    Locked: "Locked",
  } as Record<string, string>,
  capstoneHint: "Final challenge",
  optional: "Optional",
  optionalHint: "Optional modules don't count towards roadmap progress",
  shared: "Shared",
  sharedHint: "Progress in this module counts in every roadmap that uses it",
  alsoIn: "Also in:",
  completedElsewhere: "Completed in another roadmap",
  newStep: "New",
  newStepHint: "Added in the latest version of this module",
  page: {
    eyebrow: "Module",
    notFound: "Module not found",
    steps: "Steps",
    stepsCount: (n: number) => (n === 1 ? "1 step" : `${n} steps`),
    minutes: (m: number) => `${m} min`,
    version: (v: number) => `Version ${v}`,
    xp: (xp: number) => `+${xp} XP`,
    progress: "Progress",
    progressLabel: "Module progress",
    stepsOf: (done: number, total: number) => `${done} of ${total} steps`,
    usedIn: "Used in",
    usedInHint: "Progress here counts in all of these roadmaps.",
    usedInEmpty: "This module isn't part of any roadmap yet.",
    requires: "Recommended first",
    requiresHint: "Not required, but these modules make this one easier.",
  },
};
