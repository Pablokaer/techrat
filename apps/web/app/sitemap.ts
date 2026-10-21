import type { MetadataRoute } from "next";
import { LANDING_PATHS, siteUrl } from "@/lib/site-metadata";

// Built once (it only depends on PUBLIC_WEB_URL); the desktop static export requires saying so.
export const dynamic = "force-static";

/** Public pages that search engines may index; everything behind sign-in is `noindex` (app/(app)/layout.tsx). */
const PAGES = ["/register", "/login", "/privacy", "/terms", "/account/delete"];

/** /sitemap.xml: the landing page in both languages (linked to each other), then the other public pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const languages = { en: `${base}${LANDING_PATHS.en}`, "pt-BR": `${base}${LANDING_PATHS["pt-BR"]}` };
  return [
    { url: languages.en, changeFrequency: "weekly", priority: 1, alternates: { languages } },
    { url: languages["pt-BR"], changeFrequency: "weekly", priority: 1, alternates: { languages } },
    ...PAGES.map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
