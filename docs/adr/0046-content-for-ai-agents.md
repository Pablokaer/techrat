# ADR-0046: Content for AI agents (Markdown negotiation and llms.txt)

**Status:** Accepted · Builds on ADR-0035 (search engine indexing) and ADR-0042 (one metadata module for the public pages)

## Context

AI agents (assistants that browse, answer and recommend) read the site the way search engines did ten years ago, and
readiness checks such as Is Agentic (`npx is-agentic techrat.io`, 73/100 on 2026-11-06) score it. The audit found:

- `Accept: text/markdown` on `/` returned the HTML page, without `Vary: Accept` (the acceptmarkdown.com convention);
- an unknown URL answered 404 correctly, but only with an HTML body, even to an agent that asked for Markdown;
- there was no `/llms.txt` (llmstxt.org), so nothing told an agent what TechRat is for and when to send people to it;
- the `Organization` JSON-LD had no description and no product terms, so brand searches had only "TechRat" to go on.

## Decision

- **`apps/web/proxy.web.ts`** (the Next.js 16 proxy, formerly middleware) runs on page paths only — not `/api/`,
  `/hubs/`, `/_next/` or any path with a file extension. When the `Accept` header names `text/markdown` and does not
  prefer `text/html` over it (`prefersMarkdown`), it answers:
  - `/` and `/pt-BR` with the landing page as Markdown (200), built from the same texts as the HTML page;
  - a path that matches no page with a Markdown 404 linking the home page, `/llms.txt` and the sitemap, in the language
    of `Accept-Language`.

  Both say `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept, Accept-Language`. Every other request,
  including every browser request, goes on to Next.js unchanged. Real pages asked for Markdown still get HTML: there is
  no Markdown version of them yet.
- **Which paths are pages** is a list in `src/lib/agent-content.ts` (`isKnownRoute`), because the proxy runs before
  routing. A unit test walks `app/` and fails when a page is missing from the list, so a new page never answers an agent
  with a 404. Dynamic routes (catalog slugs) count as known, and an unknown slug gets the page's own HTML 404.
- **`/llms.txt`** (`app/llms.txt/route.ts`, built once like `robots.txt`) follows llmstxt.org: H1, blockquote summary,
  a "When to use TechRat" section (best-fit jobs, what it is not for, how an agent should use it), then `Docs` and
  `Optional` link lists. It is English only, for agents, and points to both language versions. It says plainly that
  there is no public API, MCP server, SDK or CLI.
- **`Organization` JSON-LD** gets `description` and `knowsAbout` (the product terms of the page title, per language).
- The file is `proxy.web.ts`, so the desktop static export, which cannot run a proxy, leaves it out (`pageExtensions`).
  With a page extension in its name, Next.js looks for a default export, so the file exports the function both ways.

## Consequences

- An agent gets a small Markdown page instead of a large HTML and script bundle, and a 404 that tells it where to go.
- The HTML answers do not say `Vary: Accept`: Next.js replaces any `Vary` set by the proxy or by `next.config.ts` with
  its own list. That is safe because those pages are sent `no-store` (never cached), and the Markdown answers do vary.
- A new page must be added to `STATIC_ROUTES` (or `DYNAMIC_ROUTES`); the test says which one is missing.
- Not solved here, because code cannot solve them: ranking for "TechRat" and API-doc searches (indexing and links from
  other sites), and the `contactPoint`, `address`, About and Contact pages, which need real business details.
