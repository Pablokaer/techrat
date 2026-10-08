import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";

const PATHS = { privacy: "/privacy", terms: "/terms", accountDelete: "/account/delete" } as const;
const OG_LOCALE: Record<Locale, string> = { en: "en_US", "pt-BR": "pt_BR" };

/**
 * Title and description of a public legal page in the visitor's language, so search engines index each page with a
 * proper snippet. These pages must stay indexable (Google Play links to them), so no `robots` rule is set.
 */
export function pageMetadata(locale: Locale, page: keyof typeof PATHS): Metadata {
  const { title, description } = messages[locale].legal.meta[page];
  const path = PATHS[page];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "TechRat", locale: OG_LOCALE[locale], title, description, url: path },
  };
}
