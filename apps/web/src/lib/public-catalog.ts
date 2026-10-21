import type { Metadata } from "next";
import type { RoadmapDetail, RoadmapSummary, Topic, TopicDetail } from "@techrat/types";
import type { Locale } from "@/i18n/config";

/**
 * Server-side reads of the public catalog for the indexable pages (/catalog, /pt-BR/catalog, ADR-0036). They call the
 * API directly (the same address the /api rewrite uses), anonymously and in the page's language, and Next.js keeps each
 * answer for `REVALIDATE_SECONDS`, so a crawler visiting every page does not turn into one API call per view.
 */
const API_URL = (process.env.API_INTERNAL_URL ?? "http://localhost:5080").replace(/\/+$/, "");
export const REVALIDATE_SECONDS = 600;

/** Slugs are lowercase words joined by hyphens; anything else is answered with 404 without asking the API. */
export const isSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

/** The JSON at `path`, or null when the API answers 404. Other failures throw (the page shows the error page). */
async function get<T>(path: string, locale: Locale): Promise<T | null> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Catalog request ${path} failed with HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const fetchRoadmaps = async (locale: Locale) => (await get<RoadmapSummary[]>("/roadmaps", locale)) ?? [];
export const fetchTopics = async (locale: Locale) => (await get<Topic[]>("/topics", locale)) ?? [];
export const fetchRoadmap = (slug: string, locale: Locale) => (isSlug(slug) ? get<RoadmapDetail>(`/roadmaps/${slug}`, locale) : Promise.resolve(null));
export const fetchTopic = (slug: string, locale: Locale) => (isSlug(slug) ? get<TopicDetail>(`/topics/${slug}`, locale) : Promise.resolve(null));

export type CatalogKind = "roadmaps" | "topics";
const PREFIX: Record<Locale, string> = { en: "", "pt-BR": "/pt-BR" };
const OG_LOCALE: Record<Locale, string> = { en: "en_US", "pt-BR": "pt_BR" };

/** Path of a catalog page in one language: `/catalog`, `/catalog/roadmaps/<slug>`, `/pt-BR/catalog/topics/<slug>`… */
export function catalogPath(locale: Locale, kind?: CatalogKind, slug?: string): string {
  return `${PREFIX[locale]}/catalog${kind && slug ? `/${kind}/${slug}` : ""}`;
}

/** The same catalog page in every language, for `hreflang` (`x-default` is English). */
export function catalogLanguages(kind?: CatalogKind, slug?: string) {
  const en = catalogPath("en", kind, slug);
  return { en, "pt-BR": catalogPath("pt-BR", kind, slug), "x-default": en };
}

/** Title (completed by the "· TechRat" template), description, canonical URL and language alternates of a catalog page. */
export function catalogMetadata(locale: Locale, title: string, description: string, kind?: CatalogKind, slug?: string): Metadata {
  const url = catalogPath(locale, kind, slug);
  return {
    title,
    description,
    alternates: { canonical: url, languages: catalogLanguages(kind, slug) },
    openGraph: { type: "website", siteName: "TechRat", locale: OG_LOCALE[locale], title, description, url },
  };
}
