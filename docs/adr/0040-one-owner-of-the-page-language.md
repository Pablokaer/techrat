# ADR-0040: One owner of the language of each page

**Status:** Accepted · Supersedes in part ADR-0011 (language selection) · Builds on ADR-0035 and ADR-0036

## Context

ADR-0011 chose no locale-prefixed URLs: the language came from the `techrat-locale` cookie, else `Accept-Language`, and
the desktop static export detected it on the client. ADR-0035 (`/pt-BR` landing page) and ADR-0036 (`/pt-BR/catalog`)
then added URLs whose language is fixed, for search engines, without revisiting that decision. The page language ended up
with three owners:

1. `requestLocale()` (cookie, then `Accept-Language`) in the root layout and in several `generateMetadata` functions;
2. the `/pt-BR` URL: `app/pt-BR/page.tsx` and the catalog shell each wrapped their content in a second `I18nProvider`
   fixed to their language, inside the root layout's provider;
3. client detection for the desktop export, which `requestLocale()` could not express ("there is no request"), so four
   callers wrote `isDesktop ? DEFAULT_LOCALE : await requestLocale()` and `BUILD_TARGET === "desktop"` was repeated in
   six files.

Consequences: the server rendered `<html lang>` from the cookie or header, so crawlers (which send neither) got
`lang="en"` on `/pt-BR` and `/pt-BR/catalog/*` (seen in production); a visitor who chose Portuguese got `lang="pt-BR"` on
the English catalog. The nested providers both wrote the module-wide locale that API calls send as `Accept-Language`
during render (the last render wins, so a re-render of the outer provider alone switched the API back to the cookie
language) and both set `document.documentElement.lang`.

## Decision

- **URL-fixed language for the public SEO pages, the visitor's language elsewhere.** `/pt-BR/**` is always Portuguese and
  `/catalog/**` always English, whatever a visitor saved; every other page (`/`, the app, sign-in, legal pages) follows
  the visitor. `/` stays the English URL for search engines (crawlers get English) but shows a visitor their language.
- **One module owns the answer:** `pageLocale(fixed?)` in `apps/web/src/i18n/server.ts` returns `{ locale, detect }`:
  the URL's language when given, else the cookie, else `Accept-Language`, else, with no request (desktop export),
  English with `detect: true` so the client finds the real language. A fixed language never reads the request, so those
  pages can still be static. Nothing else reads `BUILD_TARGET` for the language.
- **One root layout per owner, one provider per page.** There is no `app/layout.tsx`. Next.js treats each top-most layout
  as a root layout:
  - `app/(visitor-language)/layout.tsx` (route group, no URL segment): every page that follows the visitor;
  - `app/pt-BR/layout.tsx`: fixed to `pt-BR`;
  - `app/catalog/layout.web.tsx`: fixed to `en` (web build only, like the catalog pages).
  Each calls `pageLocale()` once and renders the shared `RootDocument` (`app/root-document.tsx`: fonts, global CSS,
  `<html lang>`, the single `Providers`/`I18nProvider`). Pages no longer wrap themselves in providers.
- **404 for unknown URLs:** with no layout above every page, `app/global-not-found.tsx` (`experimental.globalNotFound`)
  renders the same document in the visitor's language, with texts in both languages.
- Catalog pages call `connection()` to stay rendered per request: their root layout no longer reads the request, and the
  image build has no API to prerender `/catalog` from.
- **No proxy/middleware** to rewrite or detect languages: it does not run in the desktop static export.

## Consequences

- The server HTML has the right `<html lang>` on every page, including for crawlers; the API is asked in the page's
  language, and one provider writes it.
- Moving between root layouts is a full page load (Next.js): `/pt-BR` → `/login`, `/catalog` → `/register`, `/` →
  `/catalog`. These are entry pages, so the cost is one page load where a client navigation used to be.
- Choosing a language on a URL-fixed page still works for that page (the provider switches and the cookie is saved),
  but loading a `/pt-BR` URL again shows Portuguese: the URL wins.
- App routes live under `app/(visitor-language)/`; tests import them from there.
- Adding a URL-fixed language means a new top-level folder with its own root layout calling `pageLocale("<locale>")`.
