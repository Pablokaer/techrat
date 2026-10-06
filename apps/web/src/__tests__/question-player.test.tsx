import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnswerResult } from "@techrat/types";
import { QuestionPlayer } from "@/components/question-player";
import { makeSession, me, renderApp } from "@/test/utils";

function result(questionId: string, selected: string, correct: string, xp: number, overrides: Partial<AnswerResult> = {}): AnswerResult {
  return {
    feedback: { selectedOptionId: selected, correctOptionId: correct, isCorrect: selected === correct, explanation: "Array index access is O(1) because addresses are computed directly.", referenceUrl: "https://learn.microsoft.com/dotnet/", xpEarned: xp },
    bonusXp: 0, totalXp: me.level.totalXp + xp, level: me.level, leveledUp: false, topicSlug: "data-structures", topicLevel: 2, topicXp: 120,
    topicLeveledUp: false, currentStreak: 5, streakIncreased: false, dailyChallengeBonusXp: 0,
    session: { answered: 1, total: 2, correct: selected === correct ? 1 : 0, xpEarned: xp, isComplete: false }, completedSteps: [], ...overrides,
  };
}

describe("QuestionPlayer", () => {
  it("shows question, difficulty, XP reward, breadcrumb and progress", () => {
    renderApp(<QuestionPlayer session={makeSession()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getByText("What is the complexity of case 1?")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("+25 XP")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Data Structures");
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("requires a selection before submitting", async () => {
    renderApp(<QuestionPlayer session={makeSession()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getByRole("button", { name: /submit answer/i })).toBeDisabled();
    await userEvent.click(screen.getAllByRole("radio")[2]);
    expect(screen.getByRole("button", { name: /submit answer/i })).toBeEnabled();
  });

  it("gives correct-answer feedback with explanation, reference link and XP, and locks options", async () => {
    const submit = vi.fn(async (q: string, o: string) => result(q, o, "q1o0", 25));
    renderApp(<QuestionPlayer session={makeSession()} onSubmitAnswer={submit} />);
    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(await screen.findByText("Correct!")).toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith("q1", "q1o0", expect.any(Number));
    expect(screen.getByText(/Array index access is O\(1\)/)).toBeInTheDocument();
    expect(screen.getByText("+25 XP", { selector: "span.font-mono.text-sm" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /learn more/i });
    expect(link).toHaveAttribute("href", "https://learn.microsoft.com/dotnet/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    screen.getAllByRole("radio").forEach((r) => expect(r).toBeDisabled());
    expect(screen.getByText("Correct answer")).toBeInTheDocument();
  });

  it("gives incorrect feedback with icon + text (not color only) and highlights the right answer", async () => {
    const submit = vi.fn(async (q: string, o: string) => result(q, o, "q1o0", 0));
    renderApp(<QuestionPlayer session={makeSession()} onSubmitAnswer={submit} />);
    await userEvent.click(screen.getAllByRole("radio")[3]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(await screen.findByText("Incorrect")).toBeInTheDocument();
    expect(screen.getByText("Your answer")).toBeInTheDocument();
    expect(screen.getByText("Correct answer")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")[0]).toHaveTextContent("Correct answer");
  });

  it("advances to the next question and finally shows the session summary", async () => {
    const submit = vi.fn(async (q: string, o: string) => result(q, o, `${q}o0`, o === `${q}o0` ? 25 : 0));
    renderApp(<QuestionPlayer session={makeSession(2)} onSubmitAnswer={submit} />);
    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await userEvent.click(await screen.findByRole("button", { name: /next question/i }));

    expect(screen.getByText("What is the complexity of case 2?")).toBeInTheDocument();
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("radio")[1]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await userEvent.click(await screen.findByRole("button", { name: /see results/i }));

    expect(await screen.findByText("Session complete")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("+25")).toBeInTheDocument();
  });

  it("brings the next question's title into view instead of keeping the previous scroll position", async () => {
    const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView);
    const scrollTo = vi.mocked(window.scrollTo);
    const submit = vi.fn(async (q: string, o: string) => result(q, o, `${q}o0`, 25));
    renderApp(<QuestionPlayer session={makeSession(2)} onSubmitAnswer={submit} />);
    scrollIntoView.mockClear();
    scrollTo.mockClear();

    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(scrollIntoView).not.toHaveBeenCalled(); // feedback stays where the learner is reading
    await userEvent.click(await screen.findByRole("button", { name: /next question/i }));

    const card = screen.getByRole("region", { name: "Question 2 of 2" });
    expect(card).toHaveTextContent("What is the complexity of case 2?");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(card);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(card).toHaveFocus();

    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await userEvent.click(await screen.findByRole("button", { name: /see results/i }));
    expect(await screen.findByText("Session complete")).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("shows the right/wrong feedback right after the question, before the session stats", async () => {
    const submit = vi.fn(async (q: string, o: string) => result(q, o, `${q}o0`, 25));
    renderApp(<QuestionPlayer session={makeSession(2)} onSubmitAnswer={submit} />);
    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    const feedback = await screen.findByRole("status");
    const stats = screen.getByText("Session");
    const question = screen.getByRole("region", { name: "Question 1 of 2" });
    // Document order is the stacking order on phones: question → feedback → session stats.
    expect(question.compareDocumentPosition(feedback) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(feedback.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("supports keyboard: number keys select and Enter submits", async () => {
    const submit = vi.fn(async (q: string, o: string) => result(q, o, "q1o1", 25));
    renderApp(<QuestionPlayer session={makeSession()} onSubmitAnswer={submit} />);
    await userEvent.keyboard("2");
    expect(screen.getAllByRole("radio")[1]).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(submit).toHaveBeenCalledWith("q1", "q1o1", expect.any(Number)));
  });

  it("announces roadmap step completion and level ups", async () => {
    const submit = vi.fn(async (q: string, o: string) => result(q, o, "q1o0", 25, {
      leveledUp: true, level: { ...me.level, level: 4 },
      completedSteps: [{ roadmapId: "r", roadmapName: "Docker", stepId: "st", stepTitle: "Images & Layers", xpEarned: 50, moduleCompleted: false, roadmapCompleted: false, moduleSlug: "docker-essentials", moduleName: "Docker Essentials" }],
    }));
    renderApp(<QuestionPlayer session={makeSession()} onSubmitAnswer={submit} />);
    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(await screen.findByText("Level up! You reached level 4")).toBeInTheDocument();
    expect(screen.getByText("Roadmap step completed: Images & Layers")).toBeInTheDocument();
    expect(screen.getByText("+50 XP · Docker Essentials module · Docker")).toBeInTheDocument();
  });
});
