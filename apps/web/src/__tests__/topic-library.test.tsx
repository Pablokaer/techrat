import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TopicResources } from "@techrat/types";
import { TopicLibrary } from "@/components/topic-library";
import { qk } from "@/lib/queries";
import { renderApp } from "@/test/utils";

const library: TopicResources = {
  modules: [
    {
      slug: "linear-data-structures", name: "Linked Lists, Stacks & Queues",
      topics: [
        {
          key: "linked-lists", name: "Linked lists",
          sources: [
            { title: "Open Data Structures: Linked Lists", url: "https://opendatastructures.org/ods-python/3_Linked_Lists.html", type: "book", language: "en", note: "Free and rigorous." },
            { title: "Lista ligada (Wikipédia)", url: "https://pt.wikipedia.org/wiki/Lista_ligada", type: "article", language: "pt-BR", note: null },
          ],
        },
        { key: "stacks", name: "Stacks", sources: [{ title: "collections.deque", url: "https://docs.python.org/3/library/collections.html#collections.deque", type: "official-docs", language: "en", note: null }] },
      ],
    },
    {
      slug: "trees-and-heaps", name: "Trees & Heaps",
      topics: [{ key: "trees", name: "Trees", sources: [{ title: "Trees (Algorithms, 4th ed.)", url: "https://algs4.cs.princeton.edu/32bst/", type: "book", language: "en", note: null }] }],
    },
  ],
  cited: [
    {
      slug: "linked-lists", name: "Linked Lists",
      references: [
        { url: "https://xlinux.nist.gov/dads/HTML/linkedList.html", host: "xlinux.nist.gov", questions: 3, exampleQuestion: "Reading the k-th node" },
        { url: "https://www.postgresql.org/docs/current/btree.html", host: "postgresql.org", questions: 1, exampleQuestion: "Why databases use B-trees" },
      ],
    },
    { slug: "tries", name: "Tries", references: [{ url: "https://xlinux.nist.gov/dads/HTML/trie.html", host: "xlinux.nist.gov", questions: 2, exampleQuestion: "End-of-word flag in a trie" }] },
  ],
  totalLinks: 7,
};

function show(data: TopicResources = library) {
  return renderApp(<TopicLibrary topic="data-structures" topicName="Data Structures" />, (c) => c.setQueryData(qk.topicResources("data-structures"), data));
}

describe("Topic library", () => {
  it("opens with a heading and says how many links the learner can read", () => {
    show();
    const region = screen.getByRole("region", { name: "Study library" });
    expect(within(region).getByText(/7 links/)).toBeInTheDocument();
    expect(within(region).getByText(/to study Data Structures: curated reading from 2 modules/)).toBeInTheDocument();
  });

  it("groups the curated reading by module, then by the topics to master, with type and language badges", () => {
    show();
    const first = screen.getByRole("group", { name: "Linked Lists, Stacks & Queues" });
    expect(within(first).getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual(["Linked lists", "Stacks"]);
    const items = within(within(first).getByRole("group", { name: "Linked lists" })).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Book")).toBeInTheDocument();
    expect(within(items[0]).getByText("Free and rigorous.")).toBeInTheDocument();
    expect(within(items[1]).getByText("PT-BR")).toBeInTheDocument();
    expect(within(first).getByText("Official docs")).toBeInTheDocument();
  });

  it("keeps only the first module open so a long library stays scannable, and lets the others be opened", () => {
    show();
    expect(screen.getByRole("group", { name: "Linked Lists, Stacks & Queues" })).toHaveAttribute("open");
    expect(screen.getByRole("group", { name: "Trees & Heaps" })).not.toHaveAttribute("open");
  });

  it("links every module to its page so the learner can go practise it", () => {
    show();
    const link = screen.getByRole("link", { name: /Open module: Trees & Heaps/ });
    expect(link).toHaveAttribute("href", "/module?slug=trees-and-heaps");
    expect(link).not.toHaveAttribute("target");
  });

  it("lists the official pages cited by the questions per subtopic, with the site, how many questions use each and an example", () => {
    show();
    const group = screen.getByRole("group", { name: "Linked Lists" });
    const items = within(group).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole("link", { name: /xlinux\.nist\.gov/ })).toHaveAttribute("href", "https://xlinux.nist.gov/dads/HTML/linkedList.html");
    expect(within(items[0]).getByText(/Used in 3 questions/)).toBeInTheDocument();
    expect(within(items[0]).getByText(/Reading the k-th node/)).toBeInTheDocument();
    expect(within(items[1]).getByText(/Used in 1 question\b/)).toBeInTheDocument();
  });

  it("opens every external link in a new tab without leaking the opener", () => {
    show();
    const external = screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("https://"));
    expect(external.length).toBe(7);
    external.forEach((l) => {
      expect(l).toHaveAttribute("target", "_blank");
      expect(l.getAttribute("rel")).toContain("noopener");
      expect(l.getAttribute("rel")).toContain("noreferrer");
    });
  });

  it("renders nothing while the topic has neither curated reading nor cited pages", () => {
    show({ modules: [], cited: [], totalLinks: 0 });
    expect(screen.queryByRole("region", { name: "Study library" })).not.toBeInTheDocument();
  });

  it("still shows the cited pages when a topic has no curated reading", () => {
    show({ modules: [], cited: library.cited, totalLinks: 3 });
    expect(screen.queryByRole("heading", { name: "Curated reading" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Official pages cited in the questions" })).toBeInTheDocument();
  });

  it("speaks Portuguese when the interface is in Portuguese", () => {
    renderApp(<TopicLibrary topic="data-structures" topicName="Estruturas de Dados" />, (c) => c.setQueryData(qk.topicResources("data-structures"), library), { locale: "pt-BR" });
    expect(screen.getByRole("region", { name: "Biblioteca de estudo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Leitura selecionada" })).toBeInTheDocument();
    expect(screen.getByText(/Usada em 3 questões/)).toBeInTheDocument();
  });
});
