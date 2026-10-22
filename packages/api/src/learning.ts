import type { AnswerResult, LeaderboardScope, ModuleKind, RoadmapDetail, UserSummary } from "@techrat/types";
import type { TechRatClient } from "./index";
import { unwrap } from "./index";

/**
 * The learner's data, as both apps cache it. Web and mobile keep their own hooks (each binds the API client its own way),
 * but they share these keys so the knowledge of "what goes stale when the learner answers" lives in one place
 * ({@link refreshAfterAnswer}). Keys are TanStack Query keys: invalidating a prefix (e.g. `["topic"]`) reaches every key
 * that starts with it, which is why a topic's question list is nested under the topic.
 */
export const learnerKeys = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  topics: ["topics"] as const,
  topicProgress: ["topic-progress"] as const,
  topic: (slug: string) => ["topic", slug] as const,
  topicQuestions: (slug: string) => ["topic", slug, "questions"] as const,
  roadmaps: (category?: string) => ["roadmaps", category ?? "all"] as const,
  roadmap: (slug: string) => ["roadmap", slug] as const,
  modules: (kind?: ModuleKind) => ["modules", kind ?? "all"] as const,
  module: (slug: string) => ["module", slug] as const,
  session: (id: string) => ["session", id] as const,
  profile: (username: string) => ["profile", username] as const,
  analytics: (days: number) => ["analytics", days] as const,
  leaderboard: (scope: LeaderboardScope, topic?: string, page = 1) => ["leaderboard", scope, topic ?? "", page] as const,
  achievements: ["achievements"] as const,
  notifications: ["notifications"] as const,
  daily: ["daily"] as const,
  search: (q: string) => ["search", q] as const,
  passwordStatus: ["password-status"] as const,
  roadmapResources: (slug: string) => ["roadmap-resources", slug] as const,
  moduleResources: (slug: string) => ["module-resources", slug] as const,
  topicResources: (slug: string) => ["topic-resources", slug] as const,
};

/**
 * The few query-client methods this module uses, typed structurally so `@techrat/api` does not depend on
 * `@tanstack/react-query`: a TanStack `QueryClient` satisfies it as is.
 */
export interface LearnerCache {
  invalidateQueries(filters: { queryKey: readonly unknown[] }): Promise<void>;
  setQueryData(queryKey: readonly unknown[], updater: unknown): unknown;
}

/**
 * Everything that shows XP, level, streak or progress (prefixes, so every slug, category and page is covered). Curated
 * content (the topic catalog, study resources) and the session itself are left alone: an answer does not change them.
 */
const progressScopes: readonly (readonly unknown[])[] = [
  learnerKeys.me, learnerKeys.dashboard, learnerKeys.topicProgress, learnerKeys.achievements, learnerKeys.notifications, learnerKeys.daily,
  ["profile"], ["analytics"], ["leaderboard"], ["topic"], ["roadmap"], ["roadmaps"], ["module"], ["modules"],
];

/**
 * Marks everything an answer can change as stale, so screens refetch it. The apps call it when a session ends and when the
 * server reports a change in the background (e.g. an achievement), not after each answer: the player itself already shows
 * the per-answer result, and the cached learner is updated in place by {@link submitAnswer}.
 */
export async function refreshAfterAnswer(cache: LearnerCache): Promise<void> {
  await Promise.all(progressScopes.map((queryKey) => cache.invalidateQueries({ queryKey })));
}

/** Stores the roadmap the learner just started and refreshes the roadmap lists (their "started" badges) and the dashboard. */
export async function refreshAfterRoadmapStart(cache: LearnerCache, slug: string, roadmap: RoadmapDetail): Promise<void> {
  cache.setQueryData(learnerKeys.roadmap(slug), roadmap);
  await Promise.all([cache.invalidateQueries({ queryKey: ["roadmaps"] }), cache.invalidateQueries({ queryKey: learnerKeys.dashboard })]);
}

/** One answer to one question of a practice session. */
export interface AnswerSubmission {
  questionId: string;
  selectedOptionId: string;
  timeSpentSeconds: number;
}

/** Delivers an answer and returns the graded result; {@link answerSender} is the API one, tests can pass their own. */
export type AnswerSender = (sessionId: string, answer: AnswerSubmission) => Promise<AnswerResult>;

/** Sends answers to the API through the given client. */
export function answerSender(api: Pick<TechRatClient, "POST">): AnswerSender {
  return (sessionId, answer) =>
    unwrap(api.POST("/api/v1/practice/sessions/{id}/answers", { params: { path: { id: sessionId } }, body: answer }));
}

/**
 * Submits an answer and applies its result to the cached learner (level and streak), so the header and the player's side
 * panel update at once without refetching "me". A signed-out (null) learner stays null, and a failed submission leaves the
 * cache untouched (the error is rethrown for the player to show).
 */
export async function submitAnswer(cache: LearnerCache, send: AnswerSender, sessionId: string, answer: AnswerSubmission): Promise<AnswerResult> {
  const result = await send(sessionId, answer);
  cache.setQueryData(learnerKeys.me, (old: UserSummary | null | undefined) =>
    old ? { ...old, level: result.level, currentStreak: result.currentStreak } : old);
  return result;
}
