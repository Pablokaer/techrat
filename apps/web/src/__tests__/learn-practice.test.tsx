import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TopicQuestion } from "@techrat/types";
import { TopicQuestions } from "@/components/topic-questions";
import PracticePage from "../../app/(app)/practice/page";
import { qk } from "@/lib/queries";
import { makeSession, renderApp } from "@/test/utils";

const q = (id: string, difficulty: TopicQuestion["difficulty"], status: TopicQuestion["status"], subtopicSlug = "arrays"): TopicQuestion => ({
  id, title: `Question ${id}`, difficulty, subtopicSlug, subtopicName: subtopicSlug === "arrays" ? "Arrays" : "Trees", xpReward: 25, status,
});
const QUESTIONS = [q("a", "Easy", "New"), q("b", "Medium", "Correct"), q("c", "Hard", "Wrong", "trees"), q("d", "Hard", "New")];
const subtopics = [{ slug: "arrays", name: "Arrays" }, { slug: "trees", name: "Trees" }];

describe("Learn: a topic's questions", () => {
  it("lists every question with its difficulty and the learner's result, and filters by difficulty and subtopic", async () => {
    renderApp(<TopicQuestions topicSlug="data-structures" subtopics={subtopics} />, (c) => c.setQueryData(qk.topicQuestions("data-structures"), QUESTIONS));
    const list = screen.getByRole("list", { name: "Questions" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getByText("Question b").closest("li")).toHaveTextContent("Answered right");
    expect(within(list).getByText("Question c").closest("li")).toHaveTextContent("Answered wrong");

    await userEvent.click(screen.getByRole("radio", { name: "Hard" }));
    expect(within(list).getAllByRole("listitem").map((li) => within(li).getByText(/^Question/).textContent)).toEqual(["Question c", "Question d"]);
    await userEvent.selectOptions(screen.getByLabelText("Subtopic"), "trees");
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  });

  it("answers exactly the questions the learner picked, in list order", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(makeSession(2)), { status: 201, headers: { "Content-Type": "application/json" } }));
    renderApp(<TopicQuestions topicSlug="data-structures" subtopics={subtopics} />, (c) => c.setQueryData(qk.topicQuestions("data-structures"), QUESTIONS));
    const answer = screen.getByRole("button", { name: /answer selected/i });
    expect(answer).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox", { name: "Question d" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Question a" }));
    expect(answer).toHaveTextContent("Answer 2 selected");
    await userEvent.click(answer);

    const [req] = fetchMock.mock.calls.at(-1)!;
    const body = await (req as Request).json();
    expect(body).toEqual({ mode: "Learn", questionIds: ["a", "d"] });
  });
});

describe("Practice", () => {
  it("can start without a topic: the whole question bank", () => {
    renderApp(<PracticePage />, (c) => c.setQueryData(qk.topics, []));
    expect(screen.getByRole("button", { name: /start practice/i })).toBeEnabled();
  });
});
