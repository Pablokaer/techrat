import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LegalLinks } from "@/components/legal-links";
import type { Locale } from "@/i18n/config";
import { otherLanguage, publicPages, type PublicPage } from "@/lib/public-pages";

/** Texts of the frame, in the page's language; `nav` names the header links as a navigation landmark. */
export interface PublicFrameLabels {
  home: string;
  signIn: string;
  nav?: string;
  /** "View in …": shown only on a page with a URL per language. */
  otherLanguage?: string;
  /** A sign-up button next to "Sign in". */
  startFree?: string;
}

const LAYOUT = {
  prose: {
    header: "mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-5",
    main: "mx-auto max-w-3xl px-5 pb-16",
    footer: "mx-auto max-w-3xl border-t border-border-subtle px-5 py-6",
  },
  wide: {
    header: "mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5",
    main: "mx-auto max-w-5xl px-5 pb-16",
    footer: "mx-auto max-w-5xl border-t border-border-subtle px-5 py-6",
  },
} as const;

/**
 * The frame of every public page outside the app shell (legal pages, catalog): logo, language and sign-in links on top,
 * legal links at the bottom, readable for signed-out visitors. It uses no hooks, so it renders inside the server
 * catalog pages and the client legal pages alike.
 *
 * The language control follows the page (ADR-0042): a page with a URL per language links to its other URL (a crawler
 * can follow it, and the URL fixes the language anyway, ADR-0040); a page with one adaptive URL offers the switcher.
 * Likewise the logo goes to the landing page in the page's language, or to the adaptive `/`.
 */
export function PublicFrame({ page, locale, labels, layout = "prose", children }: {
  page: PublicPage; locale: Locale; labels: PublicFrameLabels; layout?: keyof typeof LAYOUT; children: ReactNode;
}) {
  const other = otherLanguage(page, locale);
  const classes = LAYOUT[layout];
  const Links = labels.nav ? "nav" : "div";
  return (
    <div className="min-h-dvh">
      <header className={classes.header}>
        <Link href={publicPages.landing.paths[page.perLanguage ? locale : "en"]} className="flex items-center gap-2" aria-label={labels.home}>
          <Image src="/brand/rat-192.png" alt="" width={36} height={36} />
          <span className="text-xl font-extrabold">Tech<span className="text-primary">Rat</span></span>
        </Link>
        <Links aria-label={labels.nav} className="flex items-center gap-2">
          {other ? <Link href={other.path} hrefLang={other.locale} className="btn-ghost">{labels.otherLanguage}</Link> : <LanguageSwitcher compact />}
          <Link href="/login" className="btn-ghost">{labels.signIn}</Link>
          {labels.startFree && <Link href="/register" className="btn-primary hidden sm:inline-flex">{labels.startFree}</Link>}
        </Links>
      </header>
      <main id="main" className={classes.main}>{children}</main>
      <footer className={classes.footer}>
        <LegalLinks withDelete />
      </footer>
    </div>
  );
}
