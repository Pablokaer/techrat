import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminComposition, AdminModule } from "@techrat/types";
import { Providers } from "@/components/providers";
import { qk } from "@/lib/queries";
import { me } from "@/test/utils";
import AdminPage from "../../app/(app)/admin/page";

const mod = (slug: string, name: string, kind: AdminModule["kind"], overrides: Partial<AdminModule> = {}): AdminModule => ({
  id: `id-${slug}`, slug, name, description: "", kind, category: "devops", level: "Beginner", icon: "box", isPublished: true, isStandalone: true,
  xpReward: 100, version: 1, seedManaged: true, usedInRoadmaps: ["docker"], steps: [], ...overrides,
});

const modules: AdminModule[] = [
  mod("containers", "Containers", "Core"),
  mod("compose", "Compose", "Context", { version: 2, seedManaged: false }),
  mod("docker-capstone", "Docker Capstone", "Capstone", { usedInRoadmaps: [] }),
];

interface Call { method: string; path: string; body?: unknown }

/** A tiny in-memory admin API: composition writes change what the next GET returns, like the real server. */
function mockApi() {
  const calls: Call[] = [];
  let composition: AdminComposition = {
    roadmapSlug: "docker", seedManaged: true, modules: [
      { moduleSlug: "containers", moduleName: "Containers", kind: "Core", order: 1, isRequired: true, steps: 4 },
      { moduleSlug: "compose", moduleName: "Compose", kind: "Context", order: 2, isRequired: true, steps: 3 },
    ],
  };
  const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    const body = req.method === "PUT" || req.method === "POST" ? await req.clone().json() : undefined;
    calls.push({ method: req.method, path, body });
    if (path === "/api/v1/admin/stats") return json({ users: 1, topics: 1, subtopics: 1, questions: 1, activeQuestions: 1, roadmaps: 1, steps: 7, attempts: 0, modules: 3 });
    if (path === "/api/v1/topics") return json([]);
    if (path === "/api/v1/roadmaps") return json([{ slug: "docker", name: "Docker" }]);
    if (path === "/api/v1/admin/modules") return json(modules);
    if (path === "/api/v1/admin/roadmaps/docker/modules") {
      if (req.method === "PUT") {
        const next = (body as { modules: { moduleSlug: string; isRequired: boolean }[] }).modules;
        composition = { ...composition, seedManaged: false, modules: next.map((n, i) => ({ ...composition.modules.find((x) => x.moduleSlug === n.moduleSlug)!, order: i + 1, isRequired: n.isRequired })) };
        return new Response(null, { status: 204 });
      }
      return json(composition);
    }
    return new Response(JSON.stringify({ title: "Not found" }), { status: 404, headers: { "Content-Type": "application/problem+json" } });
  });
  return calls;
}

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(qk.me, { ...me, isAdmin: true });
  render(<Providers client={client}><AdminPage /></Providers>);
  return client;
}

async function openComposition() {
  await userEvent.click(screen.getByRole("tab", { name: "Roadmaps" }));
  const picker = await screen.findByRole("combobox", { name: "Roadmap to compose" });
  await within(picker).findByRole("option", { name: "Docker" });
  await userEvent.selectOptions(picker, "docker");
  return screen.findByRole("list", { name: "Modules in this roadmap" });
}

const puts = (calls: Call[]) => calls.filter((c) => c.method === "PUT" && c.path === "/api/v1/admin/roadmaps/docker/modules");

describe("Admin roadmap composition", () => {
  let calls: Call[];
  beforeEach(() => { calls = mockApi(); });

  it("lists the roadmap's modules in order with their seed-managed state", async () => {
    renderAdmin();
    const list = await openComposition();
    const items = await within(list).findAllByRole("listitem");
    expect(items.map((li) => within(li).getByText(/Containers|Compose/).textContent)).toEqual(["Containers", "Compose"]);
    expect(screen.getByText(/Seed-managed/)).toBeInTheDocument();
    // Only modules not yet in the roadmap can be added.
    const add = screen.getByRole("combobox", { name: "Add module" });
    expect(within(add).getByRole("option", { name: /Docker Capstone/ })).toBeInTheDocument();
    expect(within(add).queryByRole("option", { name: /^Containers/ })).not.toBeInTheDocument();
  });

  it("move up reorders the list and saves the full new order with PUT", async () => {
    renderAdmin();
    const list = await openComposition();
    await within(list).findByText("Compose");
    await userEvent.click(screen.getByRole("button", { name: "Move Compose up" }));

    await waitFor(() => expect(puts(calls)).toHaveLength(1));
    expect(puts(calls)[0].body).toEqual({ modules: [{ moduleSlug: "compose", isRequired: true }, { moduleSlug: "containers", isRequired: true }] });
    await waitFor(() => expect(within(within(list).getAllByRole("listitem")[0]).getByText("Compose")).toBeInTheDocument());
    expect(await screen.findByText("Customised — the seed no longer updates this composition")).toBeInTheDocument();
  });

  it("toggling required sends the module as optional", async () => {
    renderAdmin();
    await openComposition();
    const required = await screen.findByRole("checkbox", { name: "Containers is required" });
    expect(required).toBeChecked();
    await userEvent.click(required);

    await waitFor(() => expect(puts(calls)).toHaveLength(1));
    expect(puts(calls)[0].body).toEqual({ modules: [{ moduleSlug: "containers", isRequired: false }, { moduleSlug: "compose", isRequired: true }] });
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Containers is required" })).not.toBeChecked());
  });
});

describe("Admin modules tab", () => {
  beforeEach(() => { mockApi(); });

  it("lists modules with kind, version and seed state", async () => {
    renderAdmin();
    expect(await screen.findByText("Modules", { selector: "dt" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Modules" }));
    const table = await screen.findByRole("table", { name: "Module catalog" });
    const row = (await within(table).findByText("compose")).closest("tr")!;
    expect(within(row).getByText("Context")).toBeInTheDocument();
    expect(within(row).getByText("v2")).toBeInTheDocument();
    expect(within(row).getByText("Customised")).toBeInTheDocument();
    const capstone = within(table).getByText("docker-capstone").closest("tr")!;
    expect(within(capstone).getByText("Capstone")).toBeInTheDocument();
    expect(within(capstone).getByText("Seed-managed")).toBeInTheDocument();
  });
});
