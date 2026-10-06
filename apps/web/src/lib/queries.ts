"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@techrat/api";
import type { LeaderboardScope, StartPracticeRequest } from "@techrat/types";
import { api, unwrap } from "./api";

export const qk = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  topics: ["topics"] as const,
  topic: (slug: string) => ["topic", slug] as const,
  roadmaps: (category?: string) => ["roadmaps", category ?? "all"] as const,
  roadmap: (slug: string) => ["roadmap", slug] as const,
  session: (id: string) => ["session", id] as const,
  profile: (u: string) => ["profile", u] as const,
  analytics: (days: number) => ["analytics", days] as const,
  leaderboard: (scope: string, topic?: string, page = 1) => ["leaderboard", scope, topic ?? "", page] as const,
  achievements: ["achievements"] as const,
  notifications: ["notifications"] as const,
  daily: ["daily"] as const,
  search: (q: string) => ["search", q] as const,
};

/** Current user, or null when signed out (401). */
export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      try {
        return await unwrap(api.GET("/api/v1/users/me"));
      } catch (e) {
        if (isApiError(e, 401)) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export const useDashboard = () => useQuery({ queryKey: qk.dashboard, queryFn: () => unwrap(api.GET("/api/v1/users/me/dashboard")) });
export const useTopics = () => useQuery({ queryKey: qk.topics, queryFn: () => unwrap(api.GET("/api/v1/topics")), staleTime: 5 * 60_000 });
export const useTopic = (slug: string) =>
  useQuery({ queryKey: qk.topic(slug), queryFn: () => unwrap(api.GET("/api/v1/topics/{slug}", { params: { path: { slug } } })), enabled: !!slug });
export const useRoadmaps = (category?: string) =>
  useQuery({
    queryKey: qk.roadmaps(category),
    queryFn: () => unwrap(api.GET("/api/v1/roadmaps", { params: { query: { category } } })),
    placeholderData: keepPreviousData,
  });
export const useRoadmap = (slug: string) =>
  useQuery({ queryKey: qk.roadmap(slug), queryFn: () => unwrap(api.GET("/api/v1/roadmaps/{slug}", { params: { path: { slug } } })), enabled: !!slug });
export const useSession = (id: string) =>
  useQuery({
    queryKey: qk.session(id),
    queryFn: () => unwrap(api.GET("/api/v1/practice/sessions/{id}", { params: { path: { id } } })),
    enabled: !!id,
    staleTime: Infinity,
  });
export const useProfile = (username: string) =>
  useQuery({
    queryKey: qk.profile(username),
    queryFn: () => unwrap(api.GET("/api/v1/users/{username}/profile", { params: { path: { username } } })),
    enabled: !!username,
  });
export const useAnalytics = (days: number) =>
  useQuery({ queryKey: qk.analytics(days), queryFn: () => unwrap(api.GET("/api/v1/analytics/me", { params: { query: { days } } })), placeholderData: keepPreviousData });
export const useLeaderboard = (scope: LeaderboardScope, topic?: string, page = 1) =>
  useQuery({
    queryKey: qk.leaderboard(scope, topic, page),
    queryFn: () => unwrap(api.GET("/api/v1/leaderboards/{scope}", { params: { path: { scope }, query: { topic, page, pageSize: 25 } } })),
    enabled: scope !== "Topic" || !!topic,
    placeholderData: keepPreviousData,
  });
export const useAchievements = () => useQuery({ queryKey: qk.achievements, queryFn: () => unwrap(api.GET("/api/v1/achievements")) });
export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: () => unwrap(api.GET("/api/v1/notifications")), refetchInterval: 60_000 });
export const useDailyChallenge = () => useQuery({ queryKey: qk.daily, queryFn: () => unwrap(api.GET("/api/v1/daily-challenge")) });
export const useSearch = (q: string) =>
  useQuery({
    queryKey: qk.search(q),
    queryFn: () => unwrap(api.GET("/api/v1/search", { params: { query: { q } } })),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

export function useStartPractice() {
  return useMutation({
    mutationFn: (body: StartPracticeRequest) => unwrap(api.POST("/api/v1/practice/sessions", { body })),
  });
}

export function useStartRoadmap(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/roadmaps/{slug}/start", { params: { path: { slug } } })),
    onSuccess: (data) => {
      qc.setQueryData(qk.roadmap(slug), data);
      qc.invalidateQueries({ queryKey: ["roadmaps"] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

/** Everything that depends on XP / progress. Called after answering questions. */
export function invalidateProgress(qc: ReturnType<typeof useQueryClient>) {
  for (const key of [qk.me, qk.dashboard, qk.achievements, qk.notifications, qk.daily, ["profile"], ["analytics"], ["leaderboard"], ["topic"], ["roadmap"], ["roadmaps"]])
    qc.invalidateQueries({ queryKey: key });
}
