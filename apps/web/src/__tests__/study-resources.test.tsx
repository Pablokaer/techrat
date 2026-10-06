import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ModuleResources, RoadmapResources } from "@techrat/types";
import { StudyResources } from "@/components/study-resources";
import { qk } from "@/lib/queries";
import { renderApp } from "@/test/utils";

const overview: RoadmapResources = {
  sources: [
    { title: "Pro Git", url: "https://git-scm.com/book/en/v2", type: "book", language: "en", note: "Free online." },
    { title: "Pro Git (em português)", url: "https://git-scm.com/book/pt-br/v2", type: "book", language: "pt-BR", note: null },
    { title: "Learn Git Branching", url: "https://learngitbranching.js.org/", type: "course", language: "en", note: null },
  ],
};

const module_: ModuleResources = {
  topics: [
    {
      key: "branches", name: "Branches and merging",
      sources: [
        { title: "Branches in a Nutshell", url: "https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell", type: "book", language: "en", note: "A branch is a pointer." },
        { title: "git-merge", url: "https://git-scm.com/docs/git-merge", type: "official-docs", language: "en", note: null },
      ],
    },
    { key: "undo", name: "Undoing changes", sources: [{ title: "Conventional Commits", url: "https://www.conventionalcommits.org/en/v1.0.0/", type: "spec", language: "en", note: null }] },
  ],
};

describe("Study resources", () => {
  it("lists the roadmap overview with a type badge, the language of each source and its note", () => {
    renderApp(<StudyResources roadmap="git-and-collaboration" />, (c) => c.setQueryData(qk.roadmapResources("git-and-collaboration"), overview));
    const section = screen.getByRole("region", { name: "Study resources" });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Book")).toBeInTheDocument();
    expect(within(items[0]).getByText("Free online.")).toBeInTheDocument();
    expect(within(items[1]).getByText("PT-BR")).toBeInTheDocument();
    expect(within(items[2]).getByText("Course")).toBeInTheDocument();
  });

  it("groups a module's sources under the topics to master", () => {
    renderApp(<StudyResources module="git-essentials" />, (c) => c.setQueryData(qk.moduleResources("git-essentials"), module_));
    const section = screen.getByRole("region", { name: "Study resources" });
    expect(within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Branches and merging", "Undoing changes"]);
    const first = within(screen.getByRole("group", { name: "Branches and merging" })).getAllByRole("listitem");
    expect(first).toHaveLength(2);
    expect(within(first[1]).getByText("Official docs")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Undoing changes" })).getByText("Spec")).toBeInTheDocument();
  });

  it("opens every link in a new tab without leaking the opener, and says so to screen readers", () => {
    renderApp(<StudyResources module="git-essentials" />, (c) => c.setQueryData(qk.moduleResources("git-essentials"), module_));
    const link = screen.getByRole("link", { name: /Branches in a Nutshell/ });
    expect(link).toHaveAttribute("href", "https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(within(link).getByText("(opens in a new tab)")).toHaveClass("sr-only");
    screen.getAllByRole("link").forEach((l) => expect(l).toHaveAttribute("target", "_blank"));
  });

  it("renders nothing when there is nothing curated yet", () => {
    renderApp(<StudyResources module="docker-essentials" />, (c) => c.setQueryData(qk.moduleResources("docker-essentials"), { topics: [] }));
    expect(screen.queryByRole("region", { name: "Study resources" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Study resources" })).not.toBeInTheDocument();
  });
});
