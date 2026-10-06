import type { SearchResult } from "@techrat/types";

// Query-string routes keep the app fully static-exportable for the Tauri desktop build.
export const routes = {
  topic: (slug: string, subtopic?: string) => `/topic?slug=${encodeURIComponent(slug)}${subtopic ? `&subtopic=${encodeURIComponent(subtopic)}` : ""}`,
  roadmap: (slug: string) => `/roadmap?slug=${encodeURIComponent(slug)}`,
  session: (id: string) => `/practice/session?id=${encodeURIComponent(id)}`,
  profile: (username?: string) => (username ? `/profile?u=${encodeURIComponent(username)}` : "/profile"),
  practice: (params: { topic?: string; subtopic?: string; difficulty?: string; mode?: string } = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
    return `/practice${q.size ? `?${q}` : ""}`;
  },
};

export function searchHref(r: SearchResult): string {
  if (r.type === "Roadmap") return routes.roadmap(r.slug);
  if (r.type === "Subtopic") {
    const m = r.url.match(/^\/topics\/([^?]+)\?subtopic=(.+)$/);
    if (m) return routes.topic(m[1], m[2]);
  }
  return routes.topic(r.slug);
}
