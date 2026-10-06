import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { PracticeSession, UserSummary } from "@techrat/types";
import { Providers } from "@/components/providers";
import { qk } from "@/lib/queries";

export const me: UserSummary = {
  id: "u1", username: "alex", displayName: "Alex Dev", email: "alex@example.com", avatarUrl: null, bio: null, isAdmin: false,
  level: { level: 3, totalXp: 300, xpIntoLevel: 50, xpForThisLevel: 200, xpToNextLevel: 150, progressPercent: 25 },
  currentStreak: 4, longestStreak: 9, questionsAnswered: 20, correctAnswers: 15, accuracy: 75, globalRank: 7, createdAt: "2026-01-01T00:00:00Z",
};

export function makeSession(count = 2): PracticeSession {
  return {
    id: "s1", mode: "Practice", topicSlug: "data-structures", topicName: "Data Structures", subtopicSlug: null, subtopicName: null,
    difficulty: null, roadmapStepId: null, isDailyChallenge: false, totalQuestions: count, answeredCount: 0, correctCount: 0, xpEarned: 0,
    startedAt: "2026-10-05T10:00:00Z", completedAt: null,
    questions: Array.from({ length: count }, (_, i) => ({
      id: `q${i + 1}`, index: i + 1, topicSlug: "data-structures", topicName: "Data Structures", subtopicSlug: "arrays", subtopicName: "Arrays",
      difficulty: "Medium" as const, title: `Question ${i + 1}`, questionText: `What is the complexity of case ${i + 1}?`, xpReward: 25,
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"].map((text, j) => ({ id: `q${i + 1}o${j}`, text })),
      answer: null,
    })),
  };
}

/**
 * Renders inside the real app providers with the signed-in user pre-cached (no network).
 * `seed` pre-fills other queries (e.g. `client.setQueryData(qk.roadmap(slug), data)`) before the first render.
 */
export function renderApp(ui: ReactElement, seed?: (client: QueryClient) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(qk.me, me);
  seed?.(client);
  return { client, ...render(<Providers client={client}>{ui}</Providers>) };
}
