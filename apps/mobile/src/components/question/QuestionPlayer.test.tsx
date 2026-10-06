import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@techrat/api";
import type { AnswerResult, PracticeSession, SessionQuestion } from "@techrat/types";
import * as WebBrowser from "expo-web-browser";
import { ApiProvider } from "@/lib/api-context";
import { QuestionPlayer } from "./QuestionPlayer";

const question = (id: string, title: string): SessionQuestion => ({
  id,
  index: 0,
  topicSlug: "git",
  topicName: "Git",
  subtopicSlug: "branching",
  subtopicName: "Branching",
  difficulty: "Medium",
  title,
  questionText: `Question text for ${title}`,
  xpReward: 15,
  options: ["a", "b", "c", "d"].map((o) => ({ id: `${id}-${o}`, text: `Answer ${o.toUpperCase()}` })),
  answer: null,
});

const session: PracticeSession = {
  id: "s1",
  mode: "Practice",
  topicSlug: "git",
  topicName: "Git",
  subtopicSlug: null,
  subtopicName: null,
  difficulty: null,
  roadmapStepId: null,
  isDailyChallenge: false,
  totalQuestions: 2,
  answeredCount: 0,
  correctCount: 0,
  xpEarned: 0,
  startedAt: "2026-10-05T10:00:00Z",
  completedAt: null,
  questions: [question("q1", "Rebase basics"), question("q2", "Merge strategies")],
};

/** Grades: q1's correct answer is B, q2's correct answer is C. */
function gradeResult(questionId: string, selectedOptionId: string): AnswerResult {
  const correctOptionId = questionId === "q1" ? "q1-b" : "q2-c";
  const isCorrect = selectedOptionId === correctOptionId;
  return {
    feedback: { selectedOptionId, correctOptionId, isCorrect, explanation: `Because ${correctOptionId}.`, referenceUrl: "https://git-scm.com/docs", xpEarned: isCorrect ? 15 : 0 },
    bonusXp: 0,
    totalXp: 1000,
    level: { level: 3, totalXp: 1000, xpIntoLevel: 100, xpForThisLevel: 400, xpToNextLevel: 300, progressPercent: 25 },
    leveledUp: false,
    topicSlug: "git",
    topicLevel: 2,
    topicXp: 200,
    topicLeveledUp: false,
    currentStreak: 4,
    streakIncreased: false,
    dailyChallengeBonusXp: 0,
    session: { answered: 1, total: 2, correct: isCorrect ? 1 : 0, xpEarned: isCorrect ? 15 : 0, isComplete: false },
    completedSteps: [],
  };
}

type SubmitBody = { questionId: string; selectedOptionId: string; timeSpentSeconds: number };

async function setup() {
  const bodies: SubmitBody[] = [];
  const fetchMock = jest.fn(async (input: Request) => {
    const body = JSON.parse(await input.text()) as SubmitBody;
    bodies.push(body);
    return new Response(JSON.stringify(gradeResult(body.questionId, body.selectedOptionId)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  const api = createApiClient({ baseUrl: "http://api.test", auth: { kind: "bearer", getAccessToken: () => "token" }, fetch: fetchMock as unknown as typeof fetch });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onExit = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  await render(<QuestionPlayer session={session} onExit={onExit} />, { wrapper });
  return { fetchMock, bodies, onExit };
}

describe("QuestionPlayer", () => {
  it("grades a correct answer, then an incorrect one, and shows the summary", async () => {
    const { fetchMock, bodies, onExit } = await setup();

    // Header + question
    expect(screen.getByText("Question 1 of 2")).toBeTruthy();
    expect(screen.getByText("Question text for Rebase basics")).toBeTruthy();
    expect(screen.getByTestId("submit-button")).toBeDisabled();

    // Select B (correct) — radio state follows the selection
    await fireEvent.press(screen.getByTestId("option-B"));
    expect(screen.getByTestId("option-B")).toBeChecked();
    expect(screen.getByTestId("option-A")).not.toBeChecked();
    expect(screen.getByTestId("submit-button")).toBeEnabled();
    await fireEvent.press(screen.getByTestId("submit-button"));

    expect(await screen.findByText("Correct!")).toBeTruthy();
    expect(screen.getByLabelText("+15 XP")).toBeTruthy();
    expect(screen.getByText("Because q1-b.")).toBeTruthy();
    // Options are locked and the correct one is labelled in text, not just color.
    expect(screen.getByTestId("option-A")).toBeDisabled();
    expect(screen.queryByTestId("submit-button")).toBeNull();
    expect(screen.getByLabelText(/Option B: Answer B, correct answer/)).toBeTruthy();

    // Request contract
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][0] as Request;
    expect(req.method).toBe("POST");
    expect(req.url).toBe("http://api.test/api/v1/practice/sessions/s1/answers");
    expect(req.headers.get("Authorization")).toBe("Bearer token");

    // Learn more opens the reference URL
    await fireEvent.press(screen.getByRole("link", { name: "Learn more" }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://git-scm.com/docs", expect.anything());

    // Question 2: pick A (wrong; C is correct)
    await fireEvent.press(screen.getByTestId("next-button"));
    expect(screen.getByText("Question 2 of 2")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("option-A"));
    await fireEvent.press(screen.getByTestId("submit-button"));

    expect(await screen.findByText("Incorrect")).toBeTruthy();
    expect(screen.queryByText("Correct!")).toBeNull();
    expect(screen.getByLabelText(/Option A: Answer A, your answer, incorrect/)).toBeTruthy();
    expect(screen.getByLabelText(/Option C: Answer C, correct answer/)).toBeTruthy();
    expect(screen.getByText("Your answer")).toBeTruthy();
    expect(bodies[0]).toMatchObject({ questionId: "q1", selectedOptionId: "q1-b" });
    expect(bodies[1]).toMatchObject({ questionId: "q2", selectedOptionId: "q2-a" });
    expect(typeof bodies[1].timeSpentSeconds).toBe("number");

    // Summary
    await fireEvent.press(screen.getByText("See results"));
    expect(await screen.findByText("Session complete")).toBeTruthy();
    expect(screen.getByLabelText("Correct: 1/2")).toBeTruthy();
    expect(screen.getByLabelText("Accuracy: 50%")).toBeTruthy();
    expect(screen.getByLabelText("XP earned: +15")).toBeTruthy();
    await fireEvent.press(screen.getByText("Back to home"));
    await waitFor(() => expect(onExit).toHaveBeenCalled());
  });

  it("shows a server error without locking the question", async () => {
    const api = createApiClient({
      baseUrl: "http://api.test",
      auth: { kind: "bearer", getAccessToken: () => "token" },
      fetch: (async () =>
        new Response(JSON.stringify({ title: "Conflict", detail: "This question was already answered." }), {
          status: 409,
          headers: { "Content-Type": "application/problem+json" },
        })) as unknown as typeof fetch,
    });
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <ApiProvider client={api}>
          <QuestionPlayer session={session} onExit={jest.fn()} />
        </ApiProvider>
      </QueryClientProvider>,
    );
    await fireEvent.press(screen.getByTestId("option-C"));
    await fireEvent.press(screen.getByTestId("submit-button"));
    expect(await screen.findByText("This question was already answered.")).toBeTruthy();
    expect(screen.getByTestId("option-A")).toBeEnabled();
    expect(screen.getByTestId("option-C")).toBeChecked();
  });
});
