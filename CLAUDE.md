# TechRat — instructions for Claude

## Development process: TDD

All development follows test-driven development:

1. **Red:** write a failing test that describes the behaviour before writing the production code. Run it and see it fail for the expected reason.
2. **Green:** write the smallest change that makes it pass.
3. **Refactor:** clean up with the tests green.

- Every change needs tests: features, bug fixes (start with a test that reproduces the bug) and refactors (the existing tests must keep passing). No change is done while its tests are missing or failing.
- Where tests live and how to run them:
  - Backend: unit tests in `backend/TechRat.Tests/Unit`, API/integration tests (Testcontainers PostgreSQL) in `backend/TechRat.Tests/Integration` → `cd backend && dotnet test`. CI builds with warnings as errors (`dotnet build -warnaserror`).
  - Web: Vitest + Testing Library in `apps/web/src/__tests__` → `npm test -w @techrat/web`.
  - Shared packages / mobile: `npm test -w @techrat/<package>`.
  - End to end: Playwright in `e2e/` → `npx playwright test` (with `docker compose up -d`).
  - Seed content: `python3 scripts/seed-src/validate_questions.py` must report 0 errors; seed scripts: `python3 -m unittest discover -s scripts/seed-src -p "test_*.py"`.
- Before finishing, run the affected suites plus `npm run typecheck` and `npm run lint`, and report the real results.

## Git workflow

- **One branch per change, always from `dev`** (`git fetch && git checkout -b <type>/<name> origin/dev`). Never commit to `dev` or `main`, and never add an unrelated commit to a branch that already has a PR: a new piece of work gets a new branch and its own PR into `dev`.
- **A branch lives only until its PR is merged.** GitHub deletes the remote branch on merge; delete the local one too (`git branch -d <name>`). Do not reuse a merged branch.
- **Auto-merge is on for every PR** (`.github/workflows/auto-merge.yml`, ADR-0026): a PR merges itself when CI is green. Open it as a draft, or add the `no-auto-merge` label, when it still needs review or more commits. Open PRs with `--base dev`.
- `dev` reaches `main` through the automatic promotion PR (ADR-0025), never by hand.

## Documentation

Everything must be properly documented, in the same change as the code:

- **README.md:** update it when setup, commands, environment variables, features or known limitations change.
- **README catalog:** the README must always list every roadmap and show how many questions exist (total, by difficulty, per topic). That section is generated from the seed data between `<!-- catalog:start -->` and `<!-- catalog:end -->`: after any change to roadmaps, topics or questions run `python3 scripts/seed-src/readme_catalog.py` (never edit the block by hand). CI fails when it is out of date (`--check`).
- **Architecture decisions:** record significant design choices as an ADR in `docs/adr` (follow the existing numbering and format).
- **Code:** public types and non-obvious behaviour get a short doc comment (`///` in C#, `/** */` in TypeScript) explaining *why*, matching the surrounding style.
- **Content and API:** keep `scripts/seed-src/QUESTION_AUTHORING.md` and the OpenAPI descriptions in sync with the rules they describe; regenerate the API client (`npm run generate:api`) when contracts change.

## Languages

The platform supports English (`en`) and Brazilian Portuguese (`pt-BR`). See "Languages (i18n)" in README.md for how it works.

- **Every question on the platform must be available in both English and Portuguese** (title, question text, all four options and the explanation). When you create or edit a question, write both versions and keep them equivalent: same correct option, same order of options, same technical meaning.
- The same applies to anything else a learner sees: UI strings (`apps/web/src/i18n/messages/{en,pt-BR}`), catalog texts (`backend/TechRat.Infrastructure/Seed/Data/i18n/pt-BR.json`) and server messages (`backend/TechRat.Application/Common/Localization.cs`). Never add a user-facing text in only one language.
- All 2,887 seed questions have a pt-BR translation (`validate_questions.py` enforces it); never merge a question without one.
