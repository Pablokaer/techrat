import { screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CatalogRoute, { generateMetadata as catalogMetadata } from "../../app/catalog/page.web";
import RoadmapRoute, { generateMetadata as roadmapMetadata } from "../../app/catalog/roadmaps/[slug]/page.web";
import TopicRoute, { generateMetadata as topicMetadata } from "../../app/catalog/topics/[slug]/page.web";
import PtRoadmapRoute, { generateMetadata as ptRoadmapMetadata } from "../../app/pt-BR/catalog/roadmaps/[slug]/page.web";
import PtCatalogRoute from "../../app/pt-BR/catalog/page.web";
import sitemap from "../../app/sitemap";
import { Landing } from "@/components/landing";
import { qk } from "@/lib/queries";
import { renderApp } from "@/test/utils";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));

const ROADMAP = {
  summary: {
    id: "r1", slug: "backend-developer", name: "Backend Developer", description: "Build and run the server side of web applications.",
    category: "Engineering", difficulty: "Intermediate", estimatedHours: 40, stepsCount: 2, modulesCount: 2, icon: "server",
    xpReward: 1000, prerequisites: ["computer-science-fundamentals"], progress: null, juniorRank: null,
  },
  prerequisites: [{ slug: "computer-science-fundamentals", name: "Computer Science Fundamentals", minimumPercent: 50, currentPercent: 0, isMet: false }],
  modules: [
    { id: "m1", title: "DNS & HTTP", order: 1, xpReward: 100, isCompleted: false, moduleSlug: "dns-http", kind: "Core", isRequired: true,
      description: "How a request finds the server.", usedInRoadmaps: [], completedElsewhere: false, version: 1, status: "Available",
      steps: [{ id: "s1", title: "DNS", description: "Resolve names.", order: 1, difficulty: "Easy", estimatedMinutes: 30, topicSlug: "networking",
        topicName: "Computer Networking", subtopicSlug: "dns", subtopicName: "DNS", minimumQuestions: 5, minimumAccuracy: 70, xpReward: 50,
        status: "Available", criteria: null, isNew: false }] },
    { id: "m2", title: "Message queues", order: 2, xpReward: 100, isCompleted: false, moduleSlug: "queues", kind: "Context", isRequired: false,
      description: "Async work.", usedInRoadmaps: [], completedElsewhere: false, version: 1, status: "Available",
      steps: [{ id: "s2", title: "Queues", description: "Decouple.", order: 1, difficulty: "Medium", estimatedMinutes: 30, topicSlug: "system-design",
        topicName: "System Design", subtopicSlug: "queues", subtopicName: "Queues", minimumQuestions: 5, minimumAccuracy: 70, xpReward: 50,
        status: "Available", criteria: null, isNew: false }] },
  ],
  currentStepId: null,
};
const TOPIC = {
  id: "t1", slug: "kubernetes", name: "Kubernetes", description: "Pods, deployments and services.", category: "Cloud & DevOps", icon: "cloud", order: 1,
  questions: { easy: 10, medium: 12, hard: 6, expert: 2, total: 30 },
  subtopics: [{ id: "st1", slug: "pods", name: "Pods", order: 1, questionCount: 18 }, { id: "st2", slug: "services", name: "Services", order: 2, questionCount: 12 }],
};

const api = vi.hoisted(() => ({ down: false, calls: [] as Array<{ url: string; language: string | null }> }));

/** A stand-in for the TechRat API: the catalog endpoints, and 404 for anything else. */
function fakeApi(url: string, init?: RequestInit) {
  const language = new Headers(init?.headers).get("Accept-Language");
  api.calls.push({ url, language });
  if (api.down) return Promise.reject(new TypeError("fetch failed"));
  const path = new URL(url).pathname;
  const body = {
    "/api/v1/roadmaps": [ROADMAP.summary],
    "/api/v1/roadmaps/backend-developer": ROADMAP,
    "/api/v1/topics": [TOPIC],
    "/api/v1/topics/kubernetes": { topic: TOPIC, progress: null, subtopicProgress: [], byDifficulty: [] },
  }[path];
  return Promise.resolve(body ? Response.json(body) : new Response("", { status: 404 }));
}

beforeEach(() => {
  api.down = false;
  api.calls = [];
  vi.stubGlobal("fetch", vi.fn(fakeApi));
});
afterEach(() => vi.unstubAllGlobals());

const signedOut = (c: import("@tanstack/react-query").QueryClient) => c.setQueryData(qk.me, null);
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const show = (ui: ReactElement) => renderApp(ui, signedOut);

function structuredData(container: HTMLElement) {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? "{}"));
}

describe("public roadmap page", () => {
  it("shows the whole roadmap to anyone, server-rendered from the API in the page's language", async () => {
    const { container } = show(await RoadmapRoute(params("backend-developer")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Backend Developer roadmap");
    expect(screen.getByText("Build and run the server side of web applications.")).toBeInTheDocument();
    for (const text of ["DNS & HTTP", "Message queues", "Optional", "Intermediate", "about 40 hours", "2 modules", "2 steps"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("link", { name: /Computer Networking/ })).toHaveAttribute("href", "/catalog/topics/networking");
    expect(screen.getByRole("link", { name: "Computer Science Fundamentals" })).toHaveAttribute("href", "/catalog/roadmaps/computer-science-fundamentals");
    expect(screen.getByRole("link", { name: "Start this roadmap for free" })).toHaveAttribute("href", "/register");
    expect(api.calls).toContainEqual({ url: "http://localhost:5080/api/v1/roadmaps/backend-developer", language: "en" });

    const data = structuredData(container);
    expect(data).toContainEqual(expect.objectContaining({ "@type": "Course", name: "Backend Developer", inLanguage: "en", provider: expect.objectContaining({ name: "TechRat" }) }));
    const breadcrumbs = data.find((d) => d["@type"] === "BreadcrumbList");
    expect(breadcrumbs.itemListElement.map((i: { item: string }) => i.item)).toEqual([
      "https://techrat.io/", "https://techrat.io/catalog", "https://techrat.io/catalog/roadmaps/backend-developer",
    ]);
  });

  it("has a title, a description, its canonical URL and the other language as alternate", async () => {
    const meta = await roadmapMetadata(params("backend-developer"));
    expect(meta.title).toBe("Backend Developer roadmap");
    expect(meta.description).toBe("Build and run the server side of web applications.");
    expect(meta.alternates).toEqual({
      canonical: "/catalog/roadmaps/backend-developer",
      languages: { en: "/catalog/roadmaps/backend-developer", "pt-BR": "/pt-BR/catalog/roadmaps/backend-developer", "x-default": "/catalog/roadmaps/backend-developer" },
    });
  });

  it("asks the API in Portuguese and links inside /pt-BR on the Portuguese page", async () => {
    show(await PtRoadmapRoute(params("backend-developer")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Roadmap Backend Developer");
    expect(screen.getByRole("link", { name: /Computer Networking/ })).toHaveAttribute("href", "/pt-BR/catalog/topics/networking");
    expect(screen.getByRole("link", { name: "Comece este roadmap grátis" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "View in English" })).toHaveAttribute("href", "/catalog/roadmaps/backend-developer");
    expect(api.calls.at(-1)).toEqual({ url: "http://localhost:5080/api/v1/roadmaps/backend-developer", language: "pt-BR" });
    expect((await ptRoadmapMetadata(params("backend-developer"))).alternates?.canonical).toBe("/pt-BR/catalog/roadmaps/backend-developer");
  });

  it("answers 404 for an unknown roadmap and never sends an odd slug to the API", async () => {
    await expect(RoadmapRoute(params("nope"))).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    api.calls = [];
    await expect(RoadmapRoute(params("../admin"))).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    expect(api.calls).toEqual([]);
  });
});

describe("public topic page", () => {
  it("shows the question counts and subtopics, and sends the visitor to practise", async () => {
    show(await TopicRoute(params("kubernetes")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kubernetes interview questions");
    expect(screen.getByText("30 questions")).toBeInTheDocument();
    for (const text of ["Pods", "Services", "18 questions", "12 questions"]) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Practise these questions for free" })).toHaveAttribute("href", "/register");
    const meta = await topicMetadata(params("kubernetes"));
    expect(meta.title).toBe("Kubernetes interview questions");
    expect(meta.description).toMatch(/^30 Kubernetes questions/);
    expect(meta.description!.length).toBeLessThanOrEqual(160);
  });
});

describe("catalog index", () => {
  it("links every roadmap and topic, so crawlers can reach them all", async () => {
    show(await CatalogRoute());
    const roadmaps = screen.getByRole("region", { name: "Roadmaps" });
    expect(within(roadmaps).getByRole("link", { name: /Backend Developer/ })).toHaveAttribute("href", "/catalog/roadmaps/backend-developer");
    const topics = screen.getByRole("region", { name: "Topics" });
    expect(within(topics).getByRole("link", { name: /Kubernetes/ })).toHaveAttribute("href", "/catalog/topics/kubernetes");
    expect((await catalogMetadata()).alternates?.languages).toMatchObject({ "pt-BR": "/pt-BR/catalog" });
  });

  it("is in Portuguese under /pt-BR", async () => {
    show(await PtCatalogRoute());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Roadmaps e temas");
    expect(screen.getByRole("link", { name: /Backend Developer/ })).toHaveAttribute("href", "/pt-BR/catalog/roadmaps/backend-developer");
  });
});

describe("discovery", () => {
  it("the sitemap lists the catalog in both languages, linked to each other", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    for (const path of ["/catalog", "/pt-BR/catalog", "/catalog/roadmaps/backend-developer", "/pt-BR/catalog/roadmaps/backend-developer", "/catalog/topics/kubernetes", "/pt-BR/catalog/topics/kubernetes"]) {
      expect(urls).toContain(`https://techrat.io${path}`);
    }
    expect(entries.find((e) => e.url === "https://techrat.io/catalog/topics/kubernetes")?.alternates?.languages).toEqual({
      en: "https://techrat.io/catalog/topics/kubernetes", "pt-BR": "https://techrat.io/pt-BR/catalog/topics/kubernetes",
    });
  });

  it("the sitemap still lists the fixed pages when the API is down (for example while the image is built)", async () => {
    api.down = true;
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://techrat.io/");
    expect(urls).toContain("https://techrat.io/catalog");
    expect(urls).not.toContain("https://techrat.io/catalog/topics/kubernetes");
  });

  it("the landing page links to the catalog", () => {
    show(<Landing />);
    expect(screen.getByRole("link", { name: "Explore roadmaps and topics" })).toHaveAttribute("href", "/catalog");
  });
});
