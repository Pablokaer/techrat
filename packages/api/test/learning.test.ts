import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import type { AnswerResult, RoadmapDetail, UserSummary } from "@techrat/types";
import { answerSender, createApiClient, learnerKeys, refreshAfterAnswer, refreshAfterRoadmapStart, submitAnswer } from "../src";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A cache holding data for the given keys, every query fresh (not invalidated). */
function seeded(keys: readonly (readonly unknown[])[]) {
  const qc = new QueryClient();
  for (const key of keys) qc.setQueryData(key, { seeded: key });
  return qc;
}
const isInvalidated = (qc: QueryClient, key: readonly unknown[]) => qc.getQueryState(key)?.isInvalidated ?? false;

const level = { level: 4, totalXp: 1500, xpIntoLevel: 100, xpForThisLevel: 500, xpToNextLevel: 400, progressPercent: 20 };
const answerResult = { level, currentStreak: 7, feedback: { isCorrect: true } } as unknown as AnswerResult;
const me = { id: "u1", username: "rat", currentStreak: 3, level: { ...level, level: 3 } } as unknown as UserSummary;

describe("learnerKeys", () => {
  it("nests a topic's questions under the topic, so refreshing topics reaches them", () => {
    expect(learnerKeys.topicQuestions("git").slice(0, 2)).toEqual(learnerKeys.topic("git"));
  });

  it("gives the roadmap catalog one key per category under a shared prefix", () => {
    expect(learnerKeys.roadmaps()).toEqual(["roadmaps", "all"]);
    expect(learnerKeys.roadmaps("Backend")).toEqual(["roadmaps", "Backend"]);
  });
});

describe("refreshAfterAnswer", () => {
  it("refreshes the learner's topic progress (the Learn page)", async () => {
    const qc = seeded([learnerKeys.topicProgress]);
    await refreshAfterAnswer(qc);
    expect(isInvalidated(qc, learnerKeys.topicProgress)).toBe(true);
  });

  it("refreshes everything that shows XP, level or progress", async () => {
    const stale = [
      learnerKeys.me, learnerKeys.dashboard, learnerKeys.achievements, learnerKeys.notifications, learnerKeys.daily,
      learnerKeys.profile("rat"), learnerKeys.analytics(30), learnerKeys.leaderboard("Global"), learnerKeys.leaderboard("Topic", "git", 2),
      learnerKeys.topic("git"), learnerKeys.topicQuestions("git"), learnerKeys.roadmap("backend"), learnerKeys.roadmaps(), learnerKeys.roadmaps("Backend"),
      learnerKeys.module("git-essentials"), learnerKeys.modules(), learnerKeys.modules("Core"),
    ];
    const qc = seeded(stale);
    await refreshAfterAnswer(qc);
    for (const key of stale) expect(isInvalidated(qc, key), JSON.stringify(key)).toBe(true);
  });

  it("leaves data an answer cannot change alone", async () => {
    const untouched = [learnerKeys.topics, learnerKeys.session("s1"), learnerKeys.passwordStatus, learnerKeys.roadmapResources("backend"), learnerKeys.search("git")];
    const qc = seeded(untouched);
    await refreshAfterAnswer(qc);
    for (const key of untouched) expect(isInvalidated(qc, key), JSON.stringify(key)).toBe(false);
  });
});

describe("refreshAfterRoadmapStart", () => {
  it("stores the started roadmap and refreshes the roadmap lists and the dashboard", async () => {
    const qc = seeded([learnerKeys.roadmaps(), learnerKeys.roadmaps("Backend"), learnerKeys.dashboard, learnerKeys.topicProgress]);
    const started = { summary: { slug: "backend" }, isStarted: true } as unknown as RoadmapDetail;
    await refreshAfterRoadmapStart(qc, "backend", started);
    expect(qc.getQueryData(learnerKeys.roadmap("backend"))).toBe(started);
    expect(isInvalidated(qc, learnerKeys.roadmaps())).toBe(true);
    expect(isInvalidated(qc, learnerKeys.roadmaps("Backend"))).toBe(true);
    expect(isInvalidated(qc, learnerKeys.dashboard)).toBe(true);
    expect(isInvalidated(qc, learnerKeys.topicProgress)).toBe(false);
  });
});

describe("submitAnswer", () => {
  const answer = { questionId: "q1", selectedOptionId: "q1-b", timeSpentSeconds: 12 };

  it("sends the answer and applies the new level and streak to the cached learner", async () => {
    const qc = new QueryClient();
    qc.setQueryData(learnerKeys.me, me);
    const send = vi.fn(async () => answerResult);

    const result = await submitAnswer(qc, send, "s1", answer);

    expect(result).toBe(answerResult);
    expect(send).toHaveBeenCalledWith("s1", answer);
    expect(qc.getQueryData(learnerKeys.me)).toEqual({ ...me, level, currentStreak: 7 });
  });

  it("does not invent a learner when none is cached (signed out)", async () => {
    const qc = new QueryClient();
    qc.setQueryData(learnerKeys.me, null);
    await submitAnswer(qc, async () => answerResult, "s1", answer);
    expect(qc.getQueryData(learnerKeys.me)).toBeNull();
  });

  it("leaves the cache alone when sending fails", async () => {
    const qc = new QueryClient();
    qc.setQueryData(learnerKeys.me, me);
    await expect(submitAnswer(qc, async () => { throw new Error("offline"); }, "s1", answer)).rejects.toThrow("offline");
    expect(qc.getQueryData(learnerKeys.me)).toBe(me);
  });
});

describe("answerSender", () => {
  it("posts the answer to the session through the API client", async () => {
    const requests: Request[] = [];
    const fetchMock = vi.fn(async (req: Request) => { requests.push(req.clone()); return json(answerResult); });
    const api = createApiClient({ baseUrl: "http://api.test", auth: { kind: "cookie" }, fetch: fetchMock as unknown as typeof fetch });

    const result = await answerSender(api)("s1", { questionId: "q1", selectedOptionId: "q1-b", timeSpentSeconds: 12 });

    expect(result).toEqual(answerResult);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url).toBe("http://api.test/api/v1/practice/sessions/s1/answers");
    expect(await requests[0].json()).toEqual({ questionId: "q1", selectedOptionId: "q1-b", timeSpentSeconds: 12 });
  });
});
