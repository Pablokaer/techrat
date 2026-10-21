/** Ends a text at a word boundary so it fits the ~160 characters search engines show. */
export const clip = (text: string, max = 160) => (text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`);

// Public catalog pages (/catalog and /pt-BR/catalog): roadmaps and topics anyone can read, and search engines index.
export const catalog = {
  nav: {
    label: "Account",
    home: "TechRat home",
    signIn: "Sign in",
    startFree: "Start for free",
    /** Link to the same page in the other language, written in that language. */
    otherLanguage: "Ver em português",
    breadcrumb: "Breadcrumb",
    catalog: "Catalog",
  },
  index: {
    title: "Developer roadmaps and tech interview topics",
    description: "Every TechRat roadmap, from junior to senior, and every topic with its interview questions. Free to read; create an account to practise.",
    heading: "Roadmaps and topics",
    intro: "Every learning path and every question bank on TechRat. Open one to see what it covers, then create a free account to practise.",
    roadmaps: "Roadmaps",
    topics: "Topics",
    questions: (n: number) => `${n} questions`,
    modules: (n: number) => `${n} modules`,
  },
  roadmap: {
    title: (name: string) => `${name} roadmap`,
    hours: (h: number) => `about ${h} hours`,
    modules: (n: number) => `${n} modules`,
    steps: (n: number) => `${n} steps`,
    facts: "About this roadmap",
    prerequisites: "Before you start",
    content: "What you will learn",
    optional: "Optional",
    cta: "Start this roadmap for free",
    ctaText: "Each step unlocks when you answer its questions well enough, and a module you finish counts in every roadmap that shares it.",
  },
  topic: {
    title: (name: string) => `${name} interview questions`,
    description: (total: number, name: string, about: string) =>
      clip(`${total} ${name} questions, from easy to expert, each with an explanation and a link to the official docs. ${about}`),
    questions: (n: number) => `${n} questions`,
    byDifficulty: "Questions by difficulty",
    subtopics: "Subtopics",
    cta: "Practise these questions for free",
    ctaText: "Practice adapts to your accuracy, and every answer earns XP on your level for this topic.",
  },
};
