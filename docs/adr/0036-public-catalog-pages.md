# ADR-0036: Public, server-rendered catalog pages for search engines

**Status:** Accepted · Builds on ADR-0035 (search engine indexing)

## Context

After ADR-0035 Google could index the landing page and the legal pages, but nothing about what TechRat teaches: the 45
roadmaps, the topics and the 2,950 questions are only shown inside the signed-in app (`noindex`), whose pages are
client-rendered and read the catalog with the learner's session. People search for "backend developer roadmap" or
"kubernetes interview questions"; there was no page that could answer them.

The API already serves the catalog anonymously and localizes it by `Accept-Language` (`/roadmaps`, `/roadmaps/{slug}`,
`/topics`, `/topics/{slug}`). The web app builds twice from one `app/` directory: a Node server, and a static export for
the desktop app, which supports neither dynamic routes without a fixed list of paths nor server-side data.

## Decision

- **Public pages** at `/catalog`, `/catalog/roadmaps/<slug>` and `/catalog/topics/<slug>`, and the same under
  `/pt-BR/catalog`, outside the app shell. They are server components: the HTML already holds the roadmap (modules,
  steps and the topic of each step) or the topic (question counts by difficulty, subtopics), with a link to create an
  account. The signed-in pages (`/roadmaps`, `/topic?slug=`) stay as they are.
- **Data from the API, on the server**, through `API_INTERNAL_URL` (the address of the `/api` rewrite), anonymous and in
  the page's language; `fetch` keeps each answer for 10 minutes. Slugs that are not `a-z0-9-` get 404 without a request.
- **Web build only:** the routes are `page.web.tsx` and only the web build adds `web.tsx` to `pageExtensions`.
- **SEO for each page:** title and description from the catalog, canonical URL, `hreflang` to the other language,
  JSON-LD `BreadcrumbList` and, for roadmaps, `Course`. The landing page links to the catalog and `sitemap.xml` lists
  every roadmap and topic in both languages. The sitemap is rebuilt every 15 minutes; built without the API (image
  build, desktop export) it keeps only the fixed pages.

## Consequences

- Each roadmap and topic is a page Google can rank, in English and Portuguese (about 180 indexable pages).
- The pages depend on the API at request time: if it is down, a page not yet cached shows the error page (the app is
  unusable then anyway). A catalog change shows on the public pages within 10 minutes.
- Questions themselves stay private: only titles, counts and structure are public, so the question bank is not copied
  by crawling it.
- Right after a deploy, the sitemap lacks the roadmaps and topics until its first rebuild (up to 15 minutes), because the
  image is built without the API. The catalog pages are still reachable through the links from the landing page.
