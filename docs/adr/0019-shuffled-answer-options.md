# ADR-0019: Answer options shown in a random order per session

**Status:** Accepted · Builds on ADR-0014 (Practice, Learn and Roadmaps)

## Context

Options were always shown in their authored order. Learners who repeat questions start to remember where the
correct answer is (the third option) rather than what it says. Grading, feedback, attempts and statistics already
identified options by id, so the order was only a display concern.

## Decision

- **The API shuffles, per session.** `PracticeService.GetAsync`, the single read path for a session (start, reload,
  resume, review after finishing, Learn, roadmap steps, daily challenge), returns the options of each question in the
  order `OptionShuffle.Order` gives: a Fisher–Yates shuffle seeded from SHA-256(session id, question id).
  - The same session always shows the same order, on re-render, reload and in the review, with no storage and no
    migration.
  - Another session (another attempt, another learner) gets a different order. The order is uniform: unit tests check
    all 24 orders of four options with a chi-square test, and the correct answer lands in each position ~25% of the
    time.
- **Options that refer to the others keep their place.** "All/None of the above", "Both A and B" and the Portuguese
  forms are detected by text and stay at their authored position. Only the other options move.
- **Stored data does not change.** `DisplayOrder`, `correctIndex` in the seed and the admin editor keep the authored
  order. Clients render what they receive. Letters A–D and the 1–4/A–D keys follow the displayed order, and
  correctness and highlighting use option ids.
- **Content may not point at options by position.** Explanations such as "option B is wrong" or "the last option"
  break once options move. Eight were rewritten to name the option's content, and `validate_questions.py` now rejects
  positional references in the title, question and explanation, in both languages.

## Consequences

- Changing the shuffle algorithm or the seed would change the order of past sessions in their review. It is kept
  stable on purpose.
- The order is deterministic from public ids, so it can be predicted, but that reveals nothing: the correct answer's
  authored position is itself spread evenly (seed rule), and the shuffle only adds variety.
