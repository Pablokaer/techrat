import type { Metadata, MetadataRoute } from "next";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";

/*
 * The public pages of the site and everything search engines and link previews read about them (ADR-0042): where each
 * page lives in each language, its Next.js metadata (canonical, hreflang, Open Graph, Twitter card) and its sitemap
 * entries. Metadata and sitemap are both derived from the same page description, so they cannot disagree.
 */

const DEFAULT_SITE_URL = "https://techrat.io";

/**
 * Public origin of the site. Crawlers (WhatsApp, Slack, LinkedIn, X…) only accept absolute image URLs, so
 * `metadataBase` must be the real domain; `PUBLIC_WEB_URL` is the same variable the API uses for e-mail links.
 */
export function siteUrl(): string {
  return (process.env.PUBLIC_WEB_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

const OG_LOCALE: Record<Locale, string> = { en: "en_US", "pt-BR": "pt_BR" };

/** URL prefix of the pages whose language is fixed by their URL (ADR-0040): English has none, Portuguese is /pt-BR. */
const PREFIX: Record<Locale, string> = { en: "", "pt-BR": "/pt-BR" };

/** The other language of a page that has a URL per language, for its "view in …" link. */
const OTHER: Record<Locale, Locale> = { en: "pt-BR", "pt-BR": "en" };

/** A public page as search engines see it. */
export interface PublicPage {
  /**
   * Path of the page in each language. A page with `perLanguage: false` has one URL whose language follows the visitor
   * (ADR-0040), so both entries are that URL.
   */
  readonly paths: Readonly<Record<Locale, string>>;
  /** True when each language has its own URL: then the page lists the others as `hreflang` alternates. */
  readonly perLanguage: boolean;
  readonly sitemap: { readonly priority: number; readonly changeFrequency: "weekly" | "monthly" };
}

const localized = (path: string, priority: number): PublicPage => ({
  paths: { en: `${PREFIX.en}${path}` || "/", "pt-BR": `${PREFIX["pt-BR"]}${path}` },
  perLanguage: true,
  sitemap: { priority, changeFrequency: "weekly" },
});

const adaptive = (path: string): PublicPage => ({
  paths: { en: path, "pt-BR": path },
  perLanguage: false,
  sitemap: { priority: 0.5, changeFrequency: "monthly" },
});

export type CatalogKind = "roadmaps" | "topics";

/**
 * Every public page. Only the landing page and the catalog have a URL per language (`/pt-BR`, `/pt-BR/catalog/…`), so
 * Google indexes both; the legal pages and sign-in have one URL shown in the visitor's language. Everything behind
 * sign-in is `noindex` (app/(visitor-language)/(app)/layout.tsx) and is not listed here.
 */
export const publicPages = {
  /** `/` is the English URL for search engines (crawlers send no language); visitors still see it in their own. */
  landing: localized("", 1),
  /** `/catalog`, `/catalog/roadmaps/<slug>`, `/pt-BR/catalog/topics/<slug>`… (ADR-0036). */
  catalog: (kind?: CatalogKind, slug?: string): PublicPage => localized(`/catalog${kind && slug ? `/${kind}/${slug}` : ""}`, kind && slug ? 0.8 : 0.9),
  register: adaptive("/register"),
  login: adaptive("/login"),
  privacy: adaptive("/privacy"),
  terms: adaptive("/terms"),
  accountDelete: adaptive("/account/delete"),
} as const;

/** The pages the sitemap always lists, in its order; roadmaps and topics come after them, from the API. */
export const PUBLIC_SITEMAP_PAGES: readonly PublicPage[] = [
  publicPages.landing, publicPages.catalog(), publicPages.register, publicPages.login, publicPages.privacy, publicPages.terms, publicPages.accountDelete,
];

/** Path of a catalog page in one language: `/catalog`, `/catalog/roadmaps/<slug>`, `/pt-BR/catalog/topics/<slug>`… */
export const catalogPath = (locale: Locale, kind?: CatalogKind, slug?: string) => publicPages.catalog(kind, slug).paths[locale];

/** The same page in the other language, or null when the page has one adaptive URL (its language switcher is enough). */
export function otherLanguage(page: PublicPage, locale: Locale): { locale: Locale; path: string } | null {
  return page.perLanguage ? { locale: OTHER[locale], path: page.paths[OTHER[locale]] } : null;
}

/** Open Graph and Twitter card of a page. Next.js replaces these objects whole (shallow merge), so each page sets both. */
function socialCards(locale: Locale, title: string, description: string, url: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", siteName: "TechRat", locale: OG_LOCALE[locale], title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export interface PageTexts {
  /** Language of the texts (and of `og:locale`). */
  locale: Locale;
  title: string;
  description: string;
  /** For a page shown at another language's URL: `/` is the English URL even when a visitor sees it in Portuguese. */
  url?: Locale;
  /** True when `title` must not be completed by the "· TechRat" template (the landing page title already says it). */
  absoluteTitle?: boolean;
}

/**
 * Metadata of a public page: its title and description, its own canonical URL and, when it has a URL per language,
 * reciprocal `hreflang` alternates (each version lists all of them, plus `x-default` = English), which Google needs to
 * show the right one in each country, and the Open Graph / Twitter card of a shared link.
 */
export function publicPageMetadata(page: PublicPage, { locale, title, description, url: urlLocale = locale, absoluteTitle = false }: PageTexts): Metadata {
  const url = page.paths[urlLocale];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: page.perLanguage ? { canonical: url, languages: { ...page.paths, "x-default": page.paths.en } } : { canonical: url },
    ...socialCards(locale, title, description, url),
  };
}

/** The page's sitemap entries: one per URL, each listing every language version when the page has one per language. */
export function sitemapEntries(page: PublicPage): MetadataRoute.Sitemap {
  const base = siteUrl();
  const { priority, changeFrequency } = page.sitemap;
  if (!page.perLanguage) return [{ url: `${base}${page.paths.en}`, changeFrequency, priority }];
  const languages = { en: `${base}${page.paths.en}`, "pt-BR": `${base}${page.paths["pt-BR"]}` };
  return [languages.en, languages["pt-BR"]].map((url) => ({ url, changeFrequency, priority, alternates: { languages } }));
}

/* ---------- texts of the pages whose metadata does not come from the API ---------- */

// Titles and descriptions carry the words people search for (interview questions, roadmaps), within the ~60 and ~160
// characters Google shows. The question count follows the README catalog; keep it rounded down.
const LANDING: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "TechRat — Tech interview practice and developer roadmaps",
    description: "Practice 2,900+ tech interview questions with explanations, follow roadmaps from junior to senior and level up with XP. Free, in English and Portuguese.",
  },
  "pt-BR": {
    title: "TechRat — Questões de entrevista e roadmaps para devs",
    description: "Pratique 2.900+ questões de entrevista de tecnologia com explicação, siga roadmaps do júnior ao sênior e suba de nível com XP. Grátis, em português e inglês.",
  },
};

/**
 * Metadata of every root layout, including the link preview a page falls back to. The landing texts stand for the
 * whole site; `url` stays `/` whichever root layout uses it.
 */
export function siteMetadata(locale: Locale): Metadata {
  const { title, description } = LANDING[locale];
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: "%s · TechRat" },
    description,
    applicationName: "TechRat",
    ...socialCards(locale, title, description, publicPages.landing.paths.en),
  };
}

/** The landing page with texts in `locale`, at the URL of language `url` (`/` may be shown in Portuguese, canonical `/`). */
export const landingMetadata = (locale: Locale, url: Locale = locale): Metadata =>
  publicPageMetadata(publicPages.landing, { locale, url, absoluteTitle: true, ...LANDING[locale] });

/**
 * A legal page in the visitor's language. These pages must stay indexable (Google Play links to them), so no `robots`
 * rule is set.
 */
export const legalPageMetadata = (locale: Locale, page: "privacy" | "terms" | "accountDelete"): Metadata =>
  publicPageMetadata(publicPages[page], { locale, ...messages[locale].legal.meta[page] });

/**
 * Sign in and register in the visitor's language. They stay indexable (people search for "TechRat login"), unlike the
 * other account pages, whose (auth) layout says `noindex`.
 */
export const accountPageMetadata = (locale: Locale, page: "login" | "register"): Metadata => ({
  ...publicPageMetadata(publicPages[page], { locale, ...messages[locale].auth.meta[page] }),
  robots: { index: true, follow: true },
});

/** Schema.org data for the landing page in one language: the site and its publisher, for the name and logo in results. */
export function landingStructuredData(locale: Locale) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${base}/#website`, name: "TechRat", url: `${base}${publicPages.landing.paths[locale]}`, inLanguage: locale, description: LANDING[locale].description, publisher: { "@id": `${base}/#organization` } },
      { "@type": "Organization", "@id": `${base}/#organization`, name: "TechRat", url: `${base}/`, logo: `${base}/brand/rat-192.png` },
    ],
  };
}
