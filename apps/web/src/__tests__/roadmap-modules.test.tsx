import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModuleDetail, RoadmapDetail, RoadmapModule, RoadmapStep, RoadmapSummary } from "@techrat/types";
import RoadmapPage from "../../app/(app)/roadmap/page";
import RoadmapsPage from "../../app/(app)/roadmaps/page";
import ModulePage from "../../app/(app)/module/page";
import { qk } from "@/lib/queries";
import { routes, searchHref } from "@/lib/routes";
import { renderApp } from "@/test/utils";

// The pages read `?slug=` from the URL; each test sets it here.
const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => nav.params,
  usePathname: () => "/",
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  nav.params = new URLSearchParams();
  nav.push.mockReset();
  // Back to the default from src/test/setup.ts: any unexpected request answers 401.
  vi.mocked(fetch).mockClear().mockImplementation(async () => json({ title: "Unauthorized" }, 401));
});

function step(id: string, overrides: Partial<RoadmapStep> = {}): RoadmapStep {
  return {
    id, title: id, description: "", order: 1, difficulty: "Easy", estimatedMinutes: 30, topicSlug: "git", topicName: "Git", subtopicSlug: null,
    subtopicName: null, minimumQuestions: 5, minimumAccuracy: 70, xpReward: 50, status: "Locked", criteria: null, isNew: false, ...overrides,
  };
}

function mod(slug: string, overrides: Partial<RoadmapModule> = {}): RoadmapModule {
  return {
    id: slug, title: slug, order: 1, xpReward: 100, isCompleted: false, steps: [], moduleSlug: slug, kind: "Core", isRequired: true,
    description: "", usedInRoadmaps: [], completedElsewhere: false, version: 1, status: "Locked", ...overrides,
  };
}

function summary(overrides: Partial<RoadmapSummary> = {}): RoadmapSummary {
  return {
    id: "r1", slug: "backend-developer", name: "Backend Developer", description: "Build APIs", category: "Role", difficulty: "Intermediate",
    estimatedHours: 40, stepsCount: 12, modulesCount: 5, icon: "server", xpReward: 500, prerequisites: [],
    progress: { isUnlocked: true, isStarted: true, isCompleted: false, completedSteps: 4, percentComplete: 33, lastActivityAt: null, alreadyCompletedModules: 0, alreadyCompletedSteps: 0 },
    juniorRank: null,
    ...overrides,
  };
}

const detail: RoadmapDetail = {
  summary: summary(),
  prerequisites: [],
  currentStepId: "branching",
  modules: [
    mod("git-essentials", {
      title: "Git Essentials", order: 1, isCompleted: true, status: "Completed", completedElsewhere: true,
      usedInRoadmaps: [{ slug: "junior-software-engineer", name: "Junior Software Engineer" }, { slug: "git", name: "Git" }],
      steps: [step("Basics", { status: "Completed" })],
    }),
    mod("api-design", { title: "API Design", order: 2, status: "Current", steps: [step("Branching", { id: "branching", status: "Current", isNew: true })] }),
    mod("observability-practices", { title: "Observability Practices", order: 3, kind: "BestPractices", isRequired: false }),
    mod("backend-capstone", { title: "Ship a Production API", order: 4, kind: "Capstone" }),
  ],
};

describe("Roadmap detail with reusable modules", () => {
  function renderDetail(data: RoadmapDetail = detail) {
    nav.params = new URLSearchParams({ slug: data.summary.slug });
    return renderApp(<RoadmapPage />, (client) => client.setQueryData(qk.roadmap(data.summary.slug), data));
  }

  it("marks shared modules and links the other roadmaps that use them", () => {
    renderDetail();
    const shared = screen.getByRole("listitem", { name: "Git Essentials" });
    expect(within(shared).getByText("Shared")).toBeInTheDocument();
    expect(within(shared).getByText(/Also in:/)).toBeInTheDocument();
    expect(within(shared).getByRole("link", { name: "Junior Software Engineer" })).toHaveAttribute("href", routes.roadmap("junior-software-engineer"));
    expect(within(shared).getByRole("link", { name: "Git" })).toHaveAttribute("href", routes.roadmap("git"));
    expect(within(screen.getByRole("listitem", { name: "API Design" })).queryByText("Shared")).not.toBeInTheDocument();
  });

  it("shows modules completed in another roadmap with an icon and text, not color only", () => {
    renderDetail();
    const state = screen.getByText("Completed in another roadmap");
    expect(state.closest("[data-module-status]")?.querySelector("svg")).not.toBeNull();
  });

  it("labels optional, best-practice and capstone modules", () => {
    renderDetail();
    const optional = screen.getByRole("listitem", { name: "Observability Practices" });
    expect(within(optional).getByText("Optional")).toBeInTheDocument();
    expect(within(optional).getByText("Best practices")).toBeInTheDocument();
    const capstone = screen.getByRole("listitem", { name: "Ship a Production API" });
    expect(within(capstone).getByText("Capstone")).toBeInTheDocument();
    expect(within(capstone).getByText("Final challenge")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "API Design" })).queryByText("Optional")).not.toBeInTheDocument();
  });

  it("shows module status with text and badges new steps", () => {
    renderDetail();
    expect(within(screen.getByRole("listitem", { name: "API Design" })).getByText("In progress")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "Ship a Production API" })).getByText("Locked")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getAllByText("New")).toHaveLength(1);
  });

  it("links module titles to the module page", () => {
    renderDetail();
    expect(screen.getByRole("link", { name: "API Design" })).toHaveAttribute("href", routes.module("api-design"));
  });

  it("tells the learner how much progress was credited from other roadmaps after starting", async () => {
    const notStarted = { ...detail, summary: summary({ progress: { ...summary().progress!, isStarted: false, completedSteps: 0 } }) };
    const started = { ...detail, summary: summary({ progress: { ...summary().progress!, alreadyCompletedModules: 2, alreadyCompletedSteps: 7 } }) };
    vi.mocked(fetch).mockImplementation(async () => json(started));
    renderDetail(notStarted);
    await userEvent.click(screen.getByRole("button", { name: /start roadmap/i }));
    expect(await screen.findByText("You already had 2 modules (7 steps) from other roadmaps")).toBeInTheDocument();
  });
});

describe("Roadmap cards", () => {
  it("show how many modules the learner already has", () => {
    const fresh = summary({ slug: "devops", name: "DevOps", progress: { ...summary().progress!, isStarted: false, alreadyCompletedModules: 2 } });
    const none = summary({ slug: "react", name: "React", progress: { ...summary().progress!, isStarted: false, alreadyCompletedModules: 0 } });
    renderApp(<RoadmapsPage />, (client) => client.setQueryData(qk.roadmaps(), [fresh, none]));
    expect(screen.getByText("You already have 2 of 5 modules")).toBeInTheDocument();
    expect(screen.getAllByText(/You already have/)).toHaveLength(1);
  });

  it("filter the roadmaps recommended for juniors, most recommended first", async () => {
    const idle = { ...summary().progress!, isStarted: false };
    const git = summary({ slug: "git-and-collaboration", name: "Git and Collaboration", juniorRank: 3, progress: idle });
    const k8s = summary({ slug: "kubernetes", name: "Kubernetes", progress: idle });
    const junior = summary({ slug: "junior-software-engineer", name: "Junior Software Engineer", juniorRank: 1, progress: idle });
    renderApp(<RoadmapsPage />, (client) => client.setQueryData(qk.roadmaps(), [git, k8s, junior]));
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Git and Collaboration", "Kubernetes", "Junior Software Engineer"]);

    await userEvent.click(screen.getByRole("tab", { name: "Recommended for juniors" }));

    expect(screen.getByRole("tab", { name: "Recommended for juniors" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Junior Software Engineer", "Git and Collaboration"]);
  });

  it("badge the roadmaps recommended for juniors with their rank", () => {
    const idle = { ...summary().progress!, isStarted: false };
    renderApp(<RoadmapsPage />, (client) => client.setQueryData(qk.roadmaps(), [
      summary({ slug: "sql", name: "SQL", juniorRank: 5, progress: idle }),
      summary({ slug: "kubernetes", name: "Kubernetes", progress: idle }),
    ]));
    expect(screen.getByText("#5 for juniors")).toBeInTheDocument();
    expect(screen.getAllByText(/^#\d+ for juniors$/)).toHaveLength(1);
  });
});

describe("Module page", () => {
  const moduleDetail: ModuleDetail = {
    summary: {
      id: "m1", slug: "git-essentials", name: "Git Essentials", description: "Commits, branches and merges.", kind: "Core", category: "Tools",
      level: "Beginner", icon: "git", stepsCount: 2, estimatedMinutes: 60, xpReward: 100, version: 2,
      usedInRoadmaps: [{ slug: "git", name: "Git" }, { slug: "junior-software-engineer", name: "Junior Software Engineer" }],
      progress: { isStarted: true, isCompleted: false, completedSteps: 1, completedVersion: null },
    },
    steps: [
      step("Basics", { title: "Git Basics", status: "Completed" }),
      step("branching", { title: "Branching", order: 2, status: "Current", isNew: true, criteria: { answeredQuestions: 3, correctQuestions: 2, accuracy: 66.7, requiredQuestions: 5, requiredAccuracy: 70, isMet: false } }),
    ],
    requires: [{ slug: "cli-basics", name: "Command Line Basics" }],
  };

  function renderModule() {
    nav.params = new URLSearchParams({ slug: "git-essentials" });
    return renderApp(<ModulePage />, (client) => client.setQueryData(qk.module("git-essentials"), moduleDetail));
  }

  it("renders the module, its steps, where it is used and what it requires", () => {
    renderModule();
    expect(screen.getByRole("heading", { level: 1, name: /Git Essentials/ })).toBeInTheDocument();
    expect(screen.getByText("Commits, branches and merges.")).toBeInTheDocument();
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(screen.getByText(/Git Basics/)).toBeInTheDocument();
    expect(screen.getByText(/Branching/)).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("3/5 answered · 67% accuracy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Junior Software Engineer" })).toHaveAttribute("href", routes.roadmap("junior-software-engineer"));
    expect(screen.getByRole("link", { name: "Command Line Basics" })).toHaveAttribute("href", routes.module("cli-basics"));
  });

  it("starts a practice session for the current step", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ id: "s9" }));
    renderModule();
    const buttons = screen.getAllByRole("button", { name: /practice step/i });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0]);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith(routes.session("s9")));
    // The page also asks for the module's study resources; pick the practice request.
    const request = vi.mocked(fetch).mock.calls.map(([r]) => r as Request).find((r) => r.url.endsWith("/api/v1/practice/sessions"))!;
    expect(await request.clone().json()).toEqual({ mode: "Roadmap", roadmapStepId: "branching", count: 10 });
  });
});

describe("Search", () => {
  it("maps module results to the module page", () => {
    expect(searchHref({ type: "Module", slug: "git-essentials", title: "Git Essentials", subtitle: "", icon: "", url: "/modules/git-essentials" })).toBe("/module?slug=git-essentials");
  });
});
