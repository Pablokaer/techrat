import type { MetadataRoute } from "next";
import { fetchRoadmaps, fetchTopics } from "@/lib/public-catalog";
import { PUBLIC_SITEMAP_PAGES, publicPages, sitemapEntries, type CatalogKind } from "@/lib/public-pages";

// Rebuilt every 15 minutes, so it follows the catalog; the desktop static export also requires a revalidate or static setting.
export const revalidate = 900;

/** Roadmap and topic slugs. When the API cannot be reached (the image build has no API), the sitemap goes without them. */
async function catalogSlugs(): Promise<Array<[CatalogKind, string]>> {
  try {
    const [roadmaps, topics] = await Promise.all([fetchRoadmaps("en"), fetchTopics("en")]);
    return [...roadmaps.map((r) => ["roadmaps", r.slug] as [CatalogKind, string]), ...topics.map((t) => ["topics", t.slug] as [CatalogKind, string])];
  } catch {
    return [];
  }
}

/**
 * /sitemap.xml: the fixed public pages (the landing page and the catalog in both languages, linked to each other, then
 * the pages with one URL), then every roadmap and topic. The entries come from the same page descriptions as each page's
 * canonical and `hreflang` (src/lib/public-pages.ts), so the two cannot disagree.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    ...PUBLIC_SITEMAP_PAGES.flatMap(sitemapEntries),
    ...(await catalogSlugs()).flatMap(([kind, slug]) => sitemapEntries(publicPages.catalog(kind, slug))),
  ];
}
