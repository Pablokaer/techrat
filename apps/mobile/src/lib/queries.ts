import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { unwrap } from "@techrat/api";
import type { LeaderboardScope, PracticeSession, StartPracticeRequest } from "@techrat/types";
import { useApi } from "./api-context";

export const qk = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  topics: ["topics"] as const,
  topicProgress: ["topic-progress"] as const,
  topic: (slug: string) => ["topic", slug] as const,
  roadmaps: ["roadmaps"] as const,
  roadmap: (slug: string) => ["roadmap", slug] as const,
  session: (id: string) => ["session", id] as const,
  profile: (username: string) => ["profile", username] as const,
  leaderboard: (scope: LeaderboardScope) => ["leaderboard", scope] as const,
  passwordStatus: ["password-status"] as const,
};

/** Whether the account has a password (change it) or signed up through a provider (set one). */
export function usePasswordStatus() {
  const api = useApi();
  return useQuery({ queryKey: qk.passwordStatus, queryFn: () => unwrap(api.GET("/api/v1/auth/password")), staleTime: 5 * 60_000 });
}

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: qk.me, queryFn: () => unwrap(api.GET("/api/v1/users/me")), staleTime: 60_000 });
}

export function useDashboard() {
  const api = useApi();
  return useQuery({ queryKey: qk.dashboard, queryFn: () => unwrap(api.GET("/api/v1/users/me/dashboard")) });
}

export function useTopics() {
  const api = useApi();
  return useQuery({ queryKey: qk.topics, queryFn: () => unwrap(api.GET("/api/v1/topics")), staleTime: 5 * 60_000 });
}

export function useTopicProgress() {
  const api = useApi();
  return useQuery({ queryKey: qk.topicProgress, queryFn: () => unwrap(api.GET("/api/v1/users/me/topic-progress")) });
}

export function useTopic(slug: string) {
  const api = useApi();
  return useQuery({
    queryKey: qk.topic(slug),
    queryFn: () => unwrap(api.GET("/api/v1/topics/{slug}", { params: { path: { slug } } })),
    enabled: !!slug,
  });
}

export function useRoadmaps() {
  const api = useApi();
  return useQuery({ queryKey: qk.roadmaps, queryFn: () => unwrap(api.GET("/api/v1/roadmaps")) });
}

export function useRoadmap(slug: string) {
  const api = useApi();
  return useQuery({
    queryKey: qk.roadmap(slug),
    queryFn: () => unwrap(api.GET("/api/v1/roadmaps/{slug}", { params: { path: { slug } } })),
    enabled: !!slug,
  });
}

export function useSession(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: qk.session(id),
    queryFn: () => unwrap(api.GET("/api/v1/practice/sessions/{id}", { params: { path: { id } } })),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useProfile(username: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: qk.profile(username ?? ""),
    queryFn: () => unwrap(api.GET("/api/v1/users/{username}/profile", { params: { path: { username: username! } } })),
    enabled: !!username,
  });
}

export function useLeaderboard(scope: LeaderboardScope) {
  const api = useApi();
  return useQuery({
    queryKey: qk.leaderboard(scope),
    queryFn: () => unwrap(api.GET("/api/v1/leaderboards/{scope}", { params: { path: { scope }, query: { page: 1, pageSize: 50 } } })),
    placeholderData: keepPreviousData,
  });
}

/** Starts a practice session (or the daily challenge when `body` is "daily") and seeds the session cache. */
export function useStartSession() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StartPracticeRequest | "daily"): Promise<PracticeSession> =>
      body === "daily"
        ? unwrap(api.POST("/api/v1/daily-challenge/start"))
        : unwrap(api.POST("/api/v1/practice/sessions", { body })),
    onSuccess: (s) => qc.setQueryData(qk.session(s.id), s),
  });
}

export function useStartRoadmap(slug: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/roadmaps/{slug}/start", { params: { path: { slug } } })),
    onSuccess: (data) => {
      qc.setQueryData(qk.roadmap(slug), data);
      void qc.invalidateQueries({ queryKey: qk.roadmaps });
      void qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

/** Everything that depends on XP / progress; called when a session finishes. */
export function invalidateProgress(qc: QueryClient) {
  for (const key of [qk.me, qk.dashboard, qk.topicProgress, qk.roadmaps, ["profile"], ["leaderboard"], ["topic"], ["roadmap"]])
    void qc.invalidateQueries({ queryKey: key });
}
