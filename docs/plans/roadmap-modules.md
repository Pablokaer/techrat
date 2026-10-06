# Plan: reusable module catalog + new roadmaps

Status: in progress · Owner: platform · Related: ADR-0007, ADR-0009, ADR-0010, ADR-0011 (i18n), ADR-0012 (this change)

## 1. Current model (as of this plan)

- `Roadmap` → owned `RoadmapModule` (title, order, XP) → owned `RoadmapStep` (global order inside the roadmap, scope = topic + optional subtopic, `MinimumQuestions`, `MinimumAccuracy`, XP).
- Per-user state: `UserRoadmapStepCompletion (UserId, RoadmapStepId, RoadmapId)` and `UserRoadmapProgress (CompletedSteps, CurrentStepId, CompletedAt)`.
- `RoadmapProgressService.AdvanceAsync` (called inside the answer transaction) walks every active roadmap: one query for the roadmap, one for its steps and one for completions **per roadmap** (N+1), and evaluates the current step against the latest attempt per question.
- XP (ADR-0010): step 50, module 150, roadmap 1000; recorded per step/module/roadmap id.
- Seed: `roadmaps.py` → `roadmaps.json` with modules and steps inline; the seeder inserts roadmaps whose slug is missing; step `MinimumQuestions = min(5, available)`.
- Catalog today: 32 roadmaps, 111 modules, 394 steps, **279 distinct step scopes**; 86 scopes appear in more than one roadmap (`databases/sql-basics` ×5; arrays, hash tables, HTTP, e2e testing, Dockerfile ×4).
- Overlap analysis of the 111 modules (ordered `(topic, subtopic)` lists): **no identical modules**. Strict subsets: full-stack "Data" ⊂ backend "Data"; aws-fundamentals "Cloud Concepts" ⊂ cloud-engineering "Cloud Building Blocks"; aws-fundamentals "AWS" ⊂ cloud-engineering "Operating in the Cloud" (different order); junior "Tools" ⊂ git "Git Essentials"; interview-prep #4 ⊂ senior "Leadership". 75% overlaps: frontend "React" / react "React Basics"; system-design "Distributed Systems" / senior #2. Roadmap level: aws-fundamentals is 100% contained in cloud-engineering; DSA / interview prep 71%; backend / full-stack 57%.

**Problems:** the same knowledge lives in several steps with different ids, so learners re-prove it per roadmap and earn step XP once per *copy*; nothing is reusable; adding a roadmap means copying steps.

## 2. Target model

| Entity | Notes |
|---|---|
| `LearningModule` | Catalog module (named `LearningModule` because `TechRat.Modules` is a project namespace). Slug (unique), Name, Description, Kind (`Core`, `Context`, `BestPractices`, `Capstone`), Category, Level (`RoadmapDifficulty`), Icon, EstimatedMinutes, XPReward, Version, IsPublished, IsStandalone, DisplayOrder, SeedManaged. |
| `ModuleStep` | Step inside a module: Order (inside the module), Title, Description, Difficulty, EstimatedMinutes, TopicId, SubtopicId?, MinimumQuestions, MinimumAccuracy, XPReward, IsActive, **AddedInVersion**. |
| `RoadmapModuleLink` | (RoadmapId, ModuleId) unique, (RoadmapId, Order) unique, IsRequired. |
| `ModuleDependency` | Optional "requires" edge between modules; used sparingly (e.g. `sql-for-analytics` → `sql-foundations`). Shown as guidance; cycles rejected by the validator. |
| `UserModuleStepCompletion` | (UserId, ModuleStepId) PK, CompletedAt, `XpAwarded` (false for credits mapped from legacy data). Global per user. |
| `UserModuleProgress` | (UserId, ModuleId) unique, CompletedSteps, StartedAt, CompletedAt?, CompletedVersion?. |
| `UserRoadmapProgress` | Kept: enrolment + roadmap completion; `CompletedSteps` = completed steps of required modules; `CurrentStepId` now points to a `ModuleStep`. |
| `Roadmap`, `RoadmapDependency` | Kept. `Roadmap.StepsCount` = steps of required modules (denormalised, recomputed when links change). New `CompositionSeedManaged` (false once an admin edits the composition). |

Removed after the data migration: `RoadmapModule`, `RoadmapStep`, `UserRoadmapStepCompletion`.

**Scope uniqueness (new invariant):** every `(topic, subtopic)` scope belongs to exactly one published module step. "Earn once, count everywhere" then holds by construction, and step XP can never be paid twice for the same knowledge. Capstones and best-practice packs get their own subtopics so they don't collide with Core scopes. Enforced by `validate_catalog.py`.

### Rules (backend only)
1. A step completes once per user when ≥ `MinimumQuestions` distinct questions in scope were answered with ≥ `MinimumAccuracy`% on the latest attempt per question. Opening never completes.
2. Completions are global (`UserModuleStepCompletion`); every roadmap containing the module sees them.
3. XP once: step XP on the first completion row, module XP when `UserModuleProgress.CompletedAt` is first set, roadmap XP when `UserRoadmapProgress.CompletedAt` is first set (per roadmap, even if all modules were done earlier).
4. Steps inside a module unlock sequentially; a step whose criteria are already met completes as soon as it is reached (prior knowledge counts).
5. In a roadmap, a required module is *current* when all previous required modules are completed, or when the learner already started/completed it elsewhere. Optional modules never block.
6. Roadmap progress = completed steps of required modules ÷ steps of required modules. Optional modules are reported separately.
7. `RoadmapDependency` unchanged (percent of a prerequisite roadmap).
8. Completions are permanent. A module's `Version` increments when steps are added; `UserModuleProgress.CompletedVersion` records what was completed; new steps (`AddedInVersion > CompletedVersion`) are shown as "new content" and never revoke completion or XP.
9. `AdvanceAsync` evaluates, in batches, every module the learner has started or that belongs to an enrolled roadmap: one query for the candidate modules + steps, one for completions, one grouped query for the latest attempts of all candidate scopes. It completes steps, modules and roadmaps and enqueues the outbox event as today.
10. Starting a roadmap evaluates its modules immediately and returns how many modules/steps were already complete (`alreadyCompletedModules`, `alreadyCompletedSteps`).

## 3. Data migration (existing databases)

Two layers, so the EF migration stays mechanical and loss-free and curation lives in versioned seed data:

**A. EF migration `ReusableModuleCatalog` (SQL, safe on an empty database, `ON CONFLICT DO NOTHING`):**
1. Create the new tables.
2. Each old `roadmap_module` → a `LearningModule` with the **same id**, slug `legacy-<roadmap-slug>-<order>`, kind `Context`, `SeedManaged = true`, name = old title, version 1.
3. Each old `roadmap_step` → a `ModuleStep` with the **same id** (order = rank inside its module), same scope/criteria/XP.
4. Links: (roadmap, module, old module order, required).
5. `user_roadmap_step_completions` → `user_module_step_completions` (same step ids, `XpAwarded = true` because XP was paid).
6. Rebuild `user_module_progress` from completions (completed when all steps are done); `user_roadmap_progress.completed_steps` recomputed; `current_step_id` keeps working (same ids).
7. Translations: `roadmap-module`/title → `module`/name, `roadmap-step` → `module-step`.
8. Drop the old tables. Practice sessions keep `roadmap_step_id` (same ids). XP ledger untouched.

Because ids are preserved, every existing completion, current step, practice session and translation keeps pointing to the right row.

**B. Seeder catalog sync (runs on every start, idempotent):**
1. Insert missing catalog modules/steps from `modules.json` (by slug / (module, topic, subtopic)); seed-managed modules get new steps appended (version++), never removed.
2. For roadmaps with `CompositionSeedManaged = true`, make the links match `roadmaps.json` (add, reorder, toggle required, remove). Admin-composed roadmaps are left alone.
3. Legacy modules no longer linked anywhere become `IsPublished = false` (kept for history and XP references).
4. **Credit mapping by scope:** for every completion on a legacy step, insert a completion on the catalog step with the same `(topic, subtopic)` with `XpAwarded = false` (no XP is paid again). Then recompute `UserModuleProgress` and `UserRoadmapProgress` for affected users.

Tested by: an integration test that migrates a fresh database to the previous migration, inserts old-style data, applies `ReusableModuleCatalog` and checks ids/completions/progress; and a seeder test for the credit mapping and idempotency.

## 4. Seed restructure

- `scripts/seed-src/modules.py` → `Seed/Data/modules.json` (catalog: slug, name, description, kind, category, level, icon, standalone, dependencies, steps `[topic/subtopic, title]`).
- `scripts/seed-src/roadmaps.py` → `Seed/Data/roadmaps.json` (composition only: module slugs, order, required/optional, prerequisites).
- `scripts/seed-src/validate_catalog.py` (CI): modules exist; every module used by ≥1 roadmap or standalone; no cycles (modules, roadmaps); each step scope has ≥ `MinimumQuestions` active questions; scope uniqueness; new role/language roadmaps have ≥1 Context and exactly one Capstone; Core modules reused by ≥2 roadmaps; prints the reuse report.
- `i18n/pt-BR.json` gains `modules` (name, description, step titles); roadmap entries keep name/description/category.

## 5. Dedup and composition decisions

- No two existing modules are identical, so deduplication is by **scope**: the 279 distinct scopes are grouped into granular catalog modules (one owner per scope) and every existing roadmap is re-composed from them. Recorded decisions:
  - aws-fundamentals (both modules) and cloud-engineering's first two modules → shared `cloud-foundations` + `aws-foundations`.
  - full-stack "Data" and backend "Data" → shared `sql-foundations` / `sql-for-applications`.
  - junior "Tools" and git "Git Essentials" → shared `git-essentials`.
  - frontend "React" and react "React Basics" → shared `react-foundations`.
  - DSA and interview prep → shared data-structure/algorithm modules; interview prep adds a Context module.
  - system-design "Distributed Systems" and senior → shared `distributed-systems`.
  - The full list of modules per roadmap is generated into the README catalog and the `validate_catalog.py` reuse report.
- Existing roadmap slugs are all preserved. Some roadmaps gain steps (a shared module may cover a little more than the old module did), so their percentage can drop slightly; completions are never lost. Chosen because it keeps one owner per scope (no double XP) — recorded here as the main trade-off.

## 6. Bilingual content (CLAUDE.md)

- Questions get pt-BR translations in `content.content_translations` (`question` title/text/explanation, `question-option` text), seeded from `Seed/Data/i18n/questions/<group>.pt-BR.json` and served per session (`ContentLocalizer.LoadQuestionsAsync`), not through the cached catalog dictionary.
- `ContentTranslation.SeedManaged`: seed refreshes rows it owns; admin-customised rows are kept.
- Seeded questions never edited by an admin (`UpdatedAt == CreatedAt`) follow the seed files (option order and correct answer never change), so the option-length rebalancing reaches existing databases.
- `validate_questions.py` requires a pt-BR translation for every question and limits the correct-is-longest ratio to 35% per file (EN and pt-BR). The 1,008 original questions are rebalanced first.
- All new modules, roadmaps, topics and questions are authored in EN + pt-BR.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Losing user progress in the migration | Ids preserved; migration test with old-style data; credit mapping by scope; completions never deleted. |
| Double XP after re-composition | Scope uniqueness; legacy credits inserted with `XpAwarded = false`. |
| N+1 in the answer transaction | Batched loading in `AdvanceAsync`; integration test on the answer flow. |
| Roadmap percentages shift after re-composition | Documented; completions kept; progress recomputed. |
| Generated client drift | `npm run generate:api` after API changes; never edit `schema.d.ts`. |
| Content quality / bias | Validators in CI (schema, translations, 35% bias), reference URLs verified with curl. |
| Parallel authoring collisions | Unique id prefixes and scratch dirs per agent. |

## 8. Phases

1. Analysis and plan (this document).
2. Bilingual questions (translation storage, seed, API, validator) + option-length rebalance.
3. Model, EF migration and data migration.
4. Seed restructure and validators.
5. Backend logic and API.
6. Content (new topics, modules, roadmaps, ~500 bilingual questions).
7. Web, mobile and admin.
8. Tests and E2E.
9. Docs (ADR-0012, ADR-0010 update, README, CATALOG_AUTHORING.md).

Each phase ends with build + tests and a commit.
