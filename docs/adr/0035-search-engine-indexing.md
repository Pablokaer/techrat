# ADR-0035: Search engine indexing and one landing URL per language

**Status:** Accepted · Builds on ADR-0011 (internationalization)

## Context

Production had no `robots.txt` and no `sitemap.xml` (both 404), no canonical URL on the home page, and every page of the
signed-in area was indexable although a crawler only sees an empty shell there. The titles ("Learn. Practice. Level
Up.") carried none of the words people search for, and the landing page still said "1,000+ questions" for a catalog of
2,950.

The language follows the `techrat-locale` cookie, then `Accept-Language`, on the same URL. Crawlers send neither, so
Google only ever saw the English page: the Portuguese version could not be indexed at all.

A language prefix chosen in a `proxy` (middleware) would cover every page, but `proxy` is not supported by the static
export of the desktop app, which builds from the same `app/` directory.

## Decision

- **`app/robots.ts` and `app/sitemap.ts`**, static (`force-static`, required by the desktop export). Robots blocks only
  `/api/` and `/hubs/`; private pages are excluded with `noindex` instead, which crawlers must be allowed to fetch to read.
- **`/pt-BR` is the Portuguese landing page**, a route of its own that wraps the landing in an `I18nProvider` set to
  `pt-BR`. `/` stays the adaptive page and is the English URL for crawlers. Both have their own canonical URL,
  reciprocal `hreflang` (`en`, `pt-BR`, `x-default` → `/`) and JSON-LD (`WebSite`, `Organization`). The canonical of `/`
  stays `/` even when a visitor sees it in Portuguese.
- **`noindex`** for the `(app)` route group (now under `app/(visitor-language)/`, ADR-0040) (`nofollow` too) and for the `(auth)` group (`follow`); `login` and `register`
  override it with `index, follow`, a canonical URL and their own title in the visitor's language.
- **Titles and descriptions with search terms** in both languages, within what Google shows (~60 / ~160 characters).

## Consequences

- Google can index the site in both languages and show the matching landing page per country.
- Only the landing page has a URL per language. The legal pages and sign in / register keep one adaptive URL (indexed in
  English), and the server-rendered `<html lang>` of `/pt-BR` still follows the visitor's cookie (the client sets
  `pt-BR` after hydration). Google determines the language from the content and `hreflang`, not from that attribute.
- The catalog (roadmaps, topics, questions) is behind sign-in, so the landing page is still the only real content Google
  can rank. Public, server-rendered roadmap and topic pages are the next step for search traffic.
- The question count in the metadata and the landing highlight is written by hand; update it when the catalog grows a
  lot (the README catalog has the exact figures).
