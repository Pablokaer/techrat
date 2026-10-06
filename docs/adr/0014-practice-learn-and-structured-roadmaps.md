# ADR-0014: Three ways to study: random Practice, chosen Learn, structured Roadmaps

**Status:** Accepted · Builds on ADR-0010 (XP and progression) and ADR-0012 (module catalog)

## Context

All the questions live in one bank organised by topic and subtopic, and roadmap steps point at those scopes. Learners
reported three problems:

- **Practice repeated questions.** It required a topic, sorted each session easy first, preferred questions answered
  wrong, and only counted answered questions as seen. The same Easy question opened almost every session.
- **Learn could not answer anything.** It only showed statistics and linked to Practice; nobody could choose which
  questions to answer.
- **Roadmaps were not gradual.** 24 of 43 roadmaps went from an Advanced module back to a Beginner one, and every
  step of a module had the same difficulty.

## Decision

Each area has one job:

| Area | Job | Selection |
|---|---|---|
| **Practice** (Practice, Challenge, Random) | Broad, unpredictable review | Whole bank, or an optional topic/subtopic, plus a difficulty filter (Challenge: Medium–Expert). Questions are drawn at random and shown in random order. Questions never shown to the learner come first, then ones from older sessions; questions from the last 3 sessions come only when the pool runs out. A question counts as shown when it was placed in a session, answered or not (`QuestionPicker.PickFresh`). Adaptive keeps its accuracy-driven mix. |
| **Learn** | Deliberate study | `GET /topics/{slug}/questions?subtopic=&difficulty=` lists the topic's questions, easiest first, with the learner's latest result (New / Correct / Wrong). A `Learn` session (`mode: "Learn"`, 1–50 `questionIds`) contains exactly the chosen questions in the chosen order. |
| **Roadmaps** | Structured progression | Modules go from easier to harder levels; the order is stable within a level, so authors still order peers. A module comes after the modules it `requires`, and the capstone is last. `roadmaps.py` generates this order and `validate_catalog.py` enforces it. Inside a module, step difficulty ramps up (`DifficultyRamp`): the first half of the steps is at the level's entry difficulty (Beginner Easy, Intermediate Medium, Advanced Hard, Expert Expert), the second half is one above. Step sessions keep preferring unseen questions, then ones answered wrong, and show them easiest first. |

XP, step criteria and module/roadmap completion are unchanged: any correct answer counts for every module and
roadmap whose scope contains the question, whichever area it was answered in.

## Consequences

- The seed reorders existing roadmap compositions and recomputes step difficulties on start. Learner progress is
  per step and module, so nothing is lost. The current module of an enrolled roadmap can change to the first
  unfinished module in the new order.
- Small scopes still repeat once the learner has seen all of them. The answer is more questions, not a different
  draw.
- `PracticeMode.Learn` is a new API enum value; clients regenerate their types (`npm run generate:api`).
