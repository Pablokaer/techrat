import type { AnswerFeedback, Topic } from "@techrat/types";

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** 75 -> "01:15" */
export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function greeting(hour: number): string {
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** "Ada Lovelace" -> "AL", "neo" -> "N" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Rounds a 0-100 percentage and clamps it. */
export function percent(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

export function formatNumber(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "#00FF41", 0.15 -> "rgba(0, 255, 65, 0.15)" — derives tints from theme tokens instead of new colors. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export interface TopicSection {
  title: string;
  data: Topic[];
}

/** Groups topics by category, keeping the backend order inside each group. */
export function groupTopicsByCategory(topics: Topic[]): TopicSection[] {
  const map = new Map<string, Topic[]>();
  for (const t of [...topics].sort((a, b) => a.order - b.order)) {
    const list = map.get(t.category) ?? [];
    list.push(t);
    map.set(t.category, list);
  }
  return [...map.entries()].map(([title, data]) => ({ title, data }));
}

export interface SessionStats {
  answered: number;
  correct: number;
  xp: number;
  accuracy: number;
}

export function sessionStats(answers: (AnswerFeedback | null | undefined)[]): SessionStats {
  const given = answers.filter((a): a is AnswerFeedback => !!a);
  const correct = given.filter((a) => a.isCorrect).length;
  return {
    answered: given.length,
    correct,
    xp: given.reduce((s, a) => s + a.xpEarned, 0),
    accuracy: given.length ? Math.round((100 * correct) / given.length) : 0,
  };
}

export type StepState = "Completed" | "Current" | "Locked";

export function stepState(status: string): StepState {
  return status === "Completed" || status === "Current" ? status : "Locked";
}
