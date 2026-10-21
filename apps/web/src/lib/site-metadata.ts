import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";

const DEFAULT_SITE_URL = "https://techrat.io";

/**
 * Public origin of the site. Crawlers (WhatsApp, Slack, LinkedIn, X…) only accept absolute image URLs, so
 * `metadataBase` must be the real domain; `PUBLIC_WEB_URL` is the same variable the API uses for e-mail links.
 */
export function siteUrl(): string {
  return (process.env.PUBLIC_WEB_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

// Titles and descriptions carry the words people search for (interview questions, roadmaps), within the ~60 and ~160
// characters Google shows. The question count follows the README catalog; keep it rounded down.
const META: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  en: {
    title: "TechRat — Tech interview practice and developer roadmaps",
    description: "Practice 2,900+ tech interview questions with explanations, follow roadmaps from junior to senior and level up with XP. Free, in English and Portuguese.",
    ogLocale: "en_US",
  },
  "pt-BR": {
    title: "TechRat — Questões de entrevista e roadmaps para devs",
    description: "Pratique 2.900+ questões de entrevista de tecnologia com explicação, siga roadmaps do júnior ao sênior e suba de nível com XP. Grátis, em português e inglês.",
    ogLocale: "pt_BR",
  },
};

/**
 * The landing page has one URL per language, so Google indexes both: the language of `/` itself follows the visitor's
 * cookie or browser, but crawlers send neither and get English, while `/pt-BR` is always Portuguese.
 */
export const LANDING_PATHS: Record<Locale, string> = { en: "/", "pt-BR": "/pt-BR" };
const LANDING_LANGUAGES = { ...LANDING_PATHS, "x-default": LANDING_PATHS.en };

/**
 * Root metadata, including the Open Graph / Twitter card used for link previews. The preview image itself comes
 * from `app/opengraph-image.png` and `app/twitter-image.png` (Next.js file convention).
 */
export function buildMetadata(locale: Locale): Metadata {
  const { title, description, ogLocale } = META[locale];
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: "%s · TechRat" },
    description,
    applicationName: "TechRat",
    openGraph: { type: "website", siteName: "TechRat", locale: ogLocale, title, description, url: "/" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Metadata of a landing URL with texts in `locale`: the URL's own canonical and reciprocal `hreflang` alternates (each
 * language version lists both, plus `x-default`), which Google needs to show the right one in each country. `/` may
 * be shown in Portuguese to a visitor who chose it, but its canonical stays `/`.
 */
export function landingMetadata(locale: Locale, url: string = LANDING_PATHS[locale]): Metadata {
  const { title, description, ogLocale } = META[locale];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: LANDING_LANGUAGES },
    openGraph: { type: "website", siteName: "TechRat", locale: ogLocale, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Schema.org data for the landing page in one language: the site and its publisher, for the name and logo in results. */
export function landingStructuredData(locale: Locale) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${base}/#website`, name: "TechRat", url: `${base}${LANDING_PATHS[locale]}`, inLanguage: locale, description: META[locale].description, publisher: { "@id": `${base}/#organization` } },
      { "@type": "Organization", "@id": `${base}/#organization`, name: "TechRat", url: `${base}/`, logo: `${base}/brand/rat-192.png` },
    ],
  };
}
