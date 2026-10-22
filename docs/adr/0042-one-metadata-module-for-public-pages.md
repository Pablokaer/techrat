# ADR-0042: One metadata module for the public pages

**Status:** Accepted · Builds on ADR-0035 (search engine indexing), ADR-0036 (public catalog) and ADR-0040 (one owner of
the page language)

## Context

The SEO metadata of the public pages was built in five places that copied each other:

- `buildMetadata`, `landingMetadata`, `landingStructuredData` and `LANDING_PATHS` in `src/lib/site-metadata.ts`;
- `pageMetadata` in `src/lib/page-metadata.ts` (privacy, terms, account deletion);
- `catalogMetadata`, `catalogPath`, `catalogLanguages`, `PREFIX` and `OG_LOCALE` in `src/lib/public-catalog.ts`;
- inline objects in the sign-in and register layouts;
- `bothLanguages` in `app/sitemap.ts`.

The `en → en_US` / `pt-BR → pt_BR` map was written three times, the `openGraph: { type: "website", siteName: "TechRat",
… }` literal four times, the locale → URL prefix map three times (`LANDING_PATHS`, `PREFIX`, `OTHER` in the catalog
component) and the `hreflang` + `x-default` alternates three times. The sitemap derived its URLs on its own, so nothing
tied them to the canonical URLs the pages declared.

Next.js merges metadata shallowly: a page that sets no `openGraph` or `twitter` inherits the root layout's whole object.
`/login` and `/register` set no Open Graph, so a shared link previewed as the landing page (its title, `og:url` `/`); the
legal and catalog pages set Open Graph but no Twitter card, so `twitter:title` was the landing page's on all of them.

No page had a preview image at all: Next.js attaches `app/opengraph-image.png` and `app/twitter-image.png` through a
layout in `app/` itself, and ADR-0040 removed `app/layout.tsx` (the images are still served, but no `og:image` or
`twitter:image` tag pointed to them).

The public page frame (logo header, language and sign-in links, legal footer) was written twice too: `PublicPage` in
`components/legal-pages.tsx` and `CatalogShell` in `components/public-catalog.tsx`.

## Decision

- **`src/lib/public-pages.ts` knows the public pages.** `publicPages` describes each one: its path in each language, whether
  it has a URL per language (only the landing page and the catalog do; the legal pages and sign-in have one URL whose
  language follows the visitor, ADR-0040) and its sitemap priority and frequency. `PUBLIC_SITEMAP_PAGES` lists the fixed
  ones in sitemap order.
- **Everything is derived from that description:**
  - `publicPageMetadata(page, texts)` builds a page's Next.js metadata from the title and description the caller gives:
    canonical, reciprocal `hreflang` with `x-default` (English) when the page has a URL per language, Open Graph (type,
    site name, locale, URL, title, description) and Twitter card. `landingMetadata`, `legalPageMetadata` and
    `accountPageMetadata` (sign in, register, which also stay `index, follow`) are thin wrappers that supply the texts;
    the catalog pages call it with texts from the API.
  - `sitemapEntries(page)` builds the page's sitemap entries; `app/sitemap.ts` only lists the pages and the catalog
    slugs. A test asserts that the sitemap URLs are exactly the canonical URLs the pages declare.
  - `siteMetadata(locale)` (the root layouts' metadata, `metadataBase` included), `catalogPath`, `otherLanguage` and
    `landingStructuredData` use the same paths and Open Graph builder.
- **Every page sets its own Open Graph and Twitter card**, since Next.js replaces these objects whole. Sign in and
  register now preview as themselves; legal and catalog pages get a Twitter card with their own title.
- **The preview image is named in the module** (`/opengraph-image.png`, `/twitter-image.png`, 1200×630) for every page,
  instead of relying on the file convention, which no longer reaches any page.
- **One public frame**, `components/public-frame.tsx`, used by the legal pages (client components) and the catalog
  (server components); it uses no hooks so it renders in both. It takes the page description: a page with a URL per
  language links to its other URL (`hreflang` set, followable by crawlers), a page with one URL offers the language
  switcher. The markup of both pages is unchanged.
- `src/lib/site-metadata.ts` and `src/lib/page-metadata.ts` are removed; `src/lib/public-catalog.ts` keeps only the API
  reads.

## Consequences

- Every URL, title, description, canonical, `hreflang` and robots value is the same as before (checked on the production
  build); `og:*` changed only on `/login` and `/register`, `twitter:*` on the legal and catalog pages, and every page now
  has `og:image` and `twitter:image` again.
- A new public page is one entry in `publicPages` (and in `PUBLIC_SITEMAP_PAGES` if it is fixed) plus a call to
  `publicPageMetadata` in its route; it cannot be listed in the sitemap under a URL other than its canonical.
- Giving the legal pages a URL per language later means changing their entry: their metadata, sitemap entries and the
  frame's language link follow.
