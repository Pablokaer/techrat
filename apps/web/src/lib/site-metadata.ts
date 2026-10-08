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

const META: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  en: {
    title: "TechRat — Learn. Practice. Level Up.",
    description: "A gamified learning platform for tomorrow's builders: questions, roadmaps, XP, levels and rankings for every tech career.",
    ogLocale: "en_US",
  },
  "pt-BR": {
    title: "TechRat — Aprenda. Pratique. Suba de nível.",
    description: "Uma plataforma gamificada de aprendizado para quem vai construir o futuro: questões, roadmaps, XP, níveis e rankings para todas as carreiras de tecnologia.",
    ogLocale: "pt_BR",
  },
};

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
