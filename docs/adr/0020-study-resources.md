# ADR-0020: Curated study resources per roadmap and module

**Status:** Accepted · Builds on ADR-0012 (module catalog)

## Context

Questions teach by testing, but learners also need somewhere to read about each topic. Questions carry one
`referenceUrl`, which is not enough to study a whole module. Each roadmap and module needs a short, reliable reading
list: official sources first, readable online, with the language of each source visible.

## Decision

- **Content lives in `Seed/Data/resources.json`**, keyed by roadmap slug (overview `sources`) and module slug
  (`topics`, each with `sources`). A source has a title, https URL, type (`official-docs`, `spec`, `book`, `course`,
  `video`, `article`), the language of the source and an optional note on why it is recommended. Topic names and notes
  are written in English and Portuguese in the same file.
- **No tables.** The content is curated in git, read-only at run time and not editable in the admin area, so an
  embedded file read once into a singleton (`StudyResourceCatalog`) is enough: no migration, no seeding, no
  translation rows. If admins ever need to edit it, the same DTOs can move to tables.
- **API:** `GET /api/v1/roadmaps/{slug}/resources` and `GET /api/v1/modules/{slug}/resources`. Unknown slugs are 404;
  published roadmaps and modules without curated content answer with empty lists. Names and notes come in the request
  language and sources in that language come first within a topic.
- **Web:** a "Study resources" section on the roadmap page (overview) and on each module page (topics), with a type
  badge and language tag per source and links that open in a new tab with `rel="noopener noreferrer"`.
- **Links are never invented.** `scripts/seed-src/validate_resources.py` checks the structure offline (CI) and, with
  `--check-urls`, opens every link. Only links that answered 2xx are added; the rest are reported.

## Consequences

- Links rot: re-run `--check-urls` periodically (and before a release that touches the file).
- Every roadmap and module has resources (the unit tests and CI fail otherwise), so adding one means adding its reading
  in the same change. The rollout was done by area in parallel batches, each link opened (2xx) before it was kept.
- Mobile does not show the resources yet.
