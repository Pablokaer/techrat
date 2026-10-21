import type { MetadataRoute } from "next";
import type { Locale } from "@/i18n/config";
import { catalogPath, fetchRoadmaps, fetchTopics, type CatalogKind } from "@/lib/public-catalog";
import { LANDING_PATHS, siteUrl } from "@/lib/site-metadata";

// Rebuilt every 15 minutes, so it follows the catalog; the desktop static export also requires a revalidate or static setting.
export const revalidate = 900;

/** Public pages besides the landing page and the catalog; everything behind sign-in is `noindex` (app/(app)/layout.tsx). */
const PAGES = ["/register", "/login", "/privacy", "/terms", "/account/delete"];

/** One entry per language of a page, each listing both (`hreflang` in the sitemap). */
function bothLanguages(path: (locale: Locale) => string, priority: number, changeFrequency: "weekly" | "monthly"): MetadataRoute.Sitemap {
  const base = siteUrl();
  const languages = { en: `${base}${path("en")}`, "pt-BR": `${base}${path("pt-BR")}` };
  return [languages.en, languages["pt-BR"]].map((url) => ({ url, changeFrequency, priority, alternates: { languages } }));
}

/** Roadmap and topic slugs. When the API cannot be reached (the image build has no API), the sitemap goes without them. */
async function catalogSlugs(): Promise<Array<[CatalogKind, string]>> {
  try {
    const [roadmaps, topics] = await Promise.all([fetchRoadmaps("en"), fetchTopics("en")]);
    return [...roadmaps.map((r) => ["roadmaps", r.slug] as [CatalogKind, string]), ...topics.map((t) => ["topics", t.slug] as [CatalogKind, string])];
  } catch {
    return [];
  }
}

/** /sitemap.xml: the landing page and the catalog in both languages (linked to each other), then the other public pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  return [
    ...bothLanguages((l) => LANDING_PATHS[l], 1, "weekly"),
    ...bothLanguages((l) => catalogPath(l), 0.9, "weekly"),
    ...PAGES.map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...(await catalogSlugs()).flatMap(([kind, slug]) => bothLanguages((l) => catalogPath(l, kind, slug), 0.8, "weekly")),
  ];
}
