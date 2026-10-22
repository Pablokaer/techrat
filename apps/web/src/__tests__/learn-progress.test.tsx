import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnswerResult, Topic, TopicProgress } from "@techrat/types";
import LearnPage from "../../app/(visitor-language)/(app)/learn/page";
import { QuestionPlayer } from "@/components/question-player";
import { qk } from "@/lib/queries";
import { makeSession, me, renderApp } from "@/test/utils";

const topic: Topic = {
  id: "t1", slug: "data-structures", name: "Data Structures", description: "Arrays, lists and trees.", category: "Fundamentals", icon: "binary", order: 1,
  questions: { easy: 4, medium: 3, hard: 2, expert: 1 }, subtopics: [{ id: "st1", slug: "arrays", name: "Arrays", order: 1, questionCount: 10 }],
};
const progress = (distinctAnswered: number): TopicProgress => ({
  topicSlug: topic.slug, topicName: topic.name, icon: topic.icon, category: topic.category, level: me.level,
  questionsAnswered: distinctAnswered, correctAnswers: distinctAnswered, accuracy: 100, totalQuestions: 10, distinctAnswered, completionPercent: distinctAnswered * 10, lastActivityAt: null,
});

const result: AnswerResult = {
  feedback: { selectedOptionId: "q1o0", correctOptionId: "q1o0", isCorrect: true, explanation: "Direct addressing.", referenceUrl: "https://en.wikipedia.org/wiki/Array_(data_structure)", xpEarned: 25 },
  bonusXp: 0, totalXp: me.level.totalXp + 25, level: me.level, leveledUp: false, topicSlug: topic.slug, topicLevel: 2, topicXp: 120,
  topicLeveledUp: false, currentStreak: 5, streakIncreased: false, dailyChallengeBonusXp: 0,
  session: { answered: 1, total: 1, correct: 1, xpEarned: 25, isComplete: true }, completedSteps: [],
};

describe("Learn: topic progress", () => {
  it("is refetched once the learner finishes answering, so the topic cards show the new count", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/api/v1/users/me/topic-progress")) return new Response(JSON.stringify([progress(4)]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ title: "Not found" }), { status: 404, headers: { "Content-Type": "application/problem+json" } });
    });
    renderApp(
      <>
        <LearnPage />
        <QuestionPlayer session={makeSession(1)} onSubmitAnswer={async () => result} />
      </>,
      (c) => { c.setQueryData(qk.topics, [topic]); c.setQueryData(qk.topicProgress, [progress(3)]); },
    );
    expect(screen.getByText("3/10")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await userEvent.click(await screen.findByRole("button", { name: /see results/i }));

    await waitFor(() => expect(screen.getByText("4/10")).toBeInTheDocument());
  });
});
