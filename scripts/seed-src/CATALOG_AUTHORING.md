# TechRat catalog authoring guide (modules and roadmaps)

The catalog has three layers (see ADR-0012):

1. **Topics / subtopics** (`topics.py` → `topics.json`): the question bank. A subtopic is a *scope*.
2. **Modules** (`modules.py` → `modules.json`): reusable learning units; each step points at one scope.
3. **Roadmaps** (`roadmaps.py` → `roadmaps.json`): ordered compositions of modules (required or optional) with soft prerequisites.

Regenerate and validate after any change:

```bash
python3 scripts/seed-src/topics.py
python3 scripts/seed-src/modules.py
python3 scripts/seed-src/roadmaps.py
python3 scripts/seed-src/validate_catalog.py     # scope ownership, question counts, reuse, cycles, capstones
python3 scripts/seed-src/validate_questions.py   # question schema, pt-BR translations, answer-length bias
python3 scripts/seed-src/readme_catalog.py       # README "Catalog" section (CI checks it)
```

## Designing modules

- **Granular by depth, not broad themes.** A module is one coherent unit a learner finishes in one or two sittings: 2–6 steps, ordered from basic to advanced (`sql-foundations`, `sql-for-analytics`, `docker-essentials`). "Everything about databases" is not a module.
- **One owner per scope.** Every `(topic, subtopic)` appears in exactly one module. If two roadmaps need the same knowledge, they share the module. If a roadmap needs a different angle, create a new subtopic (and questions) instead of reusing the scope in another module.
- **Enough questions.** Every step scope needs at least 5 active questions (the default step requires 5 distinct questions at 70%). Add questions before adding the step.
- **Dependencies sparingly.** `requires` is guidance shown to learners (e.g. `sql-for-analytics` requires `sql-foundations`); never create cycles.
- **Steps keep their scope forever.** Adding steps to a published module bumps its version; learners who completed it keep their completion and XP and see the new step as "new content". Removing a step from the seed deactivates it (completions stay).

## Choosing the kind

| Kind | Use when | Rules |
|---|---|---|
| `Core` | Shared building block used by several roadmaps | Must be used by ≥ 2 roadmaps (otherwise make it `Context`) |
| `Context` | Specific to one roadmap (its angle, its domain) | Every new Role/Language roadmap needs ≥ 1 |
| `BestPractices` | Scenario pack, Hard/Expert heavy ("what is wrong in this design/request/PR?") | ≥ 30 questions, ≥ 60% Hard/Expert; plugs into several roadmaps |
| `Capstone` | Final mixed-topic challenge of a roadmap | Exactly one per new Role/Language roadmap; ≥ 15 Hard/Expert scenarios in its own `capstones/<roadmap>` subtopic |

## Composing roadmaps

- Roadmap `type`: `Role`, `Language`, `SkillTrack` or `BestPractices`. New `Role`/`Language` roadmaps need ≥ 1 Context module and exactly one Capstone; skill tracks and best-practice roadmaps don't.
- Order modules so prerequisite knowledge comes first. Prefer **optional** for additions to existing roadmaps (learners' percentage doesn't drop); make a module required only when the path is incomplete without it.
- Prerequisites are soft (`minimumPercent` of another roadmap). Never lock beginner paths.
- Keep existing slugs: they are referenced by learner progress, links and achievements.
- Existing roadmaps carry `"new": false` (exempt from the Context/Capstone rule).

## Naming

- Slugs: kebab-case, stable, descriptive (`api-security-best-practices`, `cpp-memory-and-raii`). Capstones end in `-capstone`.
- Names in English in `modules.py`/`roadmaps.py`; Portuguese in `Seed/Data/i18n/pt-BR.json` (`topics`, `modules` with step titles keyed by `topic/subtopic`, `roadmaps`). Every learner-facing text exists in both languages (CLAUDE.md).

## Questions

Follow `QUESTION_AUTHORING.md`: four options, one correct, plausible distractors, verified official reference URL, pt-BR translation in `Seed/Data/i18n/questions/<file>.pt-BR.json`, correct option the strictly longest in at most 35% of each file (EN and pt-BR).
