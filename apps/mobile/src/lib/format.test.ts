import type { AnswerFeedback, Topic } from "@techrat/types";
import { resolveApiUrl } from "./config";
import { alreadyHaveModulesText, alsoInText, greeting, groupTopicsByCategory, initials, mmss, moduleKindLabel, percent, sessionStats, stepState, withAlpha } from "./format";
import { splitBlocks, splitInlineCode } from "./rich-text";

describe("format helpers", () => {
  it("formats seconds as mm:ss", () => {
    expect(mmss(0)).toBe("00:00");
    expect(mmss(75)).toBe("01:15");
    expect(mmss(-3)).toBe("00:00");
  });

  it("picks a greeting by hour", () => {
    expect(greeting(8)).toBe("Good morning");
    expect(greeting(13)).toBe("Good afternoon");
    expect(greeting(21)).toBe("Good evening");
  });

  it("builds initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("  neo ")).toBe("N");
    expect(initials("Grace Brewster Hopper")).toBe("GH");
    expect(initials("")).toBe("?");
  });

  it("clamps and rounds percentages", () => {
    expect(percent(42.6)).toBe(43);
    expect(percent(140)).toBe(100);
    expect(percent(Number.NaN)).toBe(0);
  });

  it("derives rgba tints from hex tokens", () => {
    expect(withAlpha("#00FF41", 0.12)).toBe("rgba(0, 255, 65, 0.12)");
    expect(withAlpha("not-a-color", 0.5)).toBe("not-a-color");
  });

  it("maps unknown step statuses to Locked", () => {
    expect(stepState("Completed")).toBe("Completed");
    expect(stepState("Current")).toBe("Current");
    expect(stepState("Whatever")).toBe("Locked");
  });

  it("summarises answered questions", () => {
    const a = (isCorrect: boolean, xpEarned: number) => ({ isCorrect, xpEarned }) as AnswerFeedback;
    expect(sessionStats([a(true, 10), a(false, 0), null, a(true, 20)])).toEqual({ answered: 3, correct: 2, xp: 30, accuracy: 67 });
    expect(sessionStats([])).toEqual({ answered: 0, correct: 0, xp: 0, accuracy: 0 });
  });

  it("groups topics by category in order", () => {
    const t = (slug: string, category: string, order: number) => ({ slug, category, order }) as Topic;
    const groups = groupTopicsByCategory([t("react", "Frontend", 2), t("sql", "Data", 1), t("css", "Frontend", 0)]);
    expect(groups.map((g) => [g.title, g.data.map((x) => x.slug)])).toEqual([
      ["Frontend", ["css", "react"]],
      ["Data", ["sql"]],
    ]);
  });
});

describe("module catalog helpers", () => {
  it("labels the module kinds worth calling out", () => {
    expect(moduleKindLabel("Capstone")).toBe("Capstone");
    expect(moduleKindLabel("BestPractices")).toBe("Best practices");
    expect(moduleKindLabel("Core")).toBeNull();
    expect(moduleKindLabel("Context")).toBeNull();
    expect(moduleKindLabel("SomethingNew")).toBeNull();
  });

  it("lists the other roadmaps that reuse a module", () => {
    expect(alsoInText(["Frontend"])).toBe("Also in: Frontend");
    expect(alsoInText(["A", "B", "C"])).toBe("Also in: A, B, C");
    expect(alsoInText(["A", "B", "C", "D", "E"])).toBe("Also in: A, B, C +2 more");
    expect(alsoInText([])).toBeNull();
  });

  it("describes modules already completed in other roadmaps", () => {
    expect(alreadyHaveModulesText(2, 5)).toBe("You already have 2 of 5 modules");
    expect(alreadyHaveModulesText(1, 1)).toBe("You already have 1 of 1 module");
    expect(alreadyHaveModulesText(0, 5)).toBeNull();
  });
});

describe("resolveApiUrl", () => {
  it("prefers the env var and strips trailing slashes", () => {
    expect(resolveApiUrl("https://api.techrat.dev/", "ios")).toBe("https://api.techrat.dev");
  });
  it("defaults per platform", () => {
    expect(resolveApiUrl(undefined, "android")).toBe("http://10.0.2.2:5080");
    expect(resolveApiUrl("  ", "ios")).toBe("http://localhost:5080");
  });
});

describe("rich text", () => {
  it("separates code blocks from prose", () => {
    expect(splitBlocks("What does this print?\nconst x = 1;\nconsole.log(x);")).toEqual([
      { code: false, text: "What does this print?" },
      { code: true, text: "const x = 1;\nconsole.log(x);" },
    ]);
  });
  it("splits inline code spans", () => {
    expect(splitInlineCode("Use `git rebase` here")).toEqual([
      { code: false, text: "Use " },
      { code: true, text: "git rebase" },
      { code: false, text: " here" },
    ]);
  });
});
