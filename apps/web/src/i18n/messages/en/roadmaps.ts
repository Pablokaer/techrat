export const roadmaps = {
  /** Labels for roadmap step status values from the API. */
  stepStatus: {
    Locked: "Locked",
    Available: "Available",
    Current: "Current",
    InProgress: "In progress",
    Completed: "Completed",
  } as Record<string, string>,
  list: {
    breadcrumb: "Learn › Learning Roadmaps",
    titleBefore: "Learning ",
    titleAccent: "Roadmaps",
    titleAfter: "",
    subtitle: "Follow structured, real-world learning paths. Steps unlock as you prove what you know — opening a step is never enough.",
    allPaths: "All Paths",
    /** Filter tab: only the platform's top roadmaps for junior developers, most recommended first. */
    juniorPaths: "Recommended for juniors",
    /** Card badge with the roadmap's position among the junior recommendations. */
    juniorRank: (rank: number) => `#${rank} for juniors`,
    categoriesLabel: "Roadmap categories",
    inProgress: "In progress",
    exploreMore: "Explore more",
    allRoadmaps: "All roadmaps",
    locked: "Locked",
    progressLabel: (name: string) => `${name} progress`,
    steps: (done: number, total: number) => `${done}/${total} steps`,
    hours: (h: number) => `${h}h`,
    viewPrerequisites: "View prerequisites",
    continuePath: "Continue path",
    viewPath: "View path",
    /** Modules of this roadmap the learner already completed elsewhere (they count here too). */
    alreadyHave: (done: number, total: number) => `You already have ${done} of ${total} modules`,
  },
  detail: {
    notFound: "Roadmap not found",
    started: (name: string) => `You started ${name}`,
    startError: "Could not start roadmap",
    practiceError: "Could not start practice",
    locked: "Locked",
    start: "Start roadmap",
    progress: "Progress",
    stepsOf: (done: number, total: number) => `${done} of ${total} steps`,
    progressLabel: "Roadmap progress",
    estimatedTime: "Estimated time",
    xpOnCompletion: "XP on completion",
    prerequisites: "Prerequisites",
    met: "Met",
    notMet: "Not met",
    prereqPercent: (current: number, min: number) => `— ${current}% of ${min}% required`,
    moduleXp: (xp: number) => `module +${xp} XP`,
    stepMeta: (minutes: number, questions: number, accuracy: number) => `${minutes} min · need ${questions} questions at ${accuracy}%`,
    stepProgress: "Step progress",
    stepCriteria: (answered: number, min: number, accuracy: number) => `${answered}/${min} answered · ${accuracy}% accuracy`,
    practiceStep: "Practice step",
    /** Toast body after starting a roadmap whose modules were partly completed in other roadmaps. */
    credited: (modules: number, steps: number) => {
      const s = steps === 1 ? "1 step" : `${steps} steps`;
      if (modules === 0) return `You already had ${s} from other roadmaps`;
      return `You already had ${modules === 1 ? "1 module" : `${modules} modules`} (${s}) from other roadmaps`;
    },
  },
};
