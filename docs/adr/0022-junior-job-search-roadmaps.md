# ADR-0022: Junior job-search roadmaps with SOLID and TDD at the core

**Status:** Accepted · Builds on ADR-0012 (module catalog) and ADR-0015 (roadmaps recommended for juniors)

## Context

The catalog taught a junior developer the technology (fundamentals, Git, SQL, HTTP, testing, security, Docker, CI/CD) and
had an interview path built for algorithms and system design. Nothing covered the other half of a first job: the
behavioral and junior-level technical interview, the first weeks at work and pull requests seen from a newcomer's side.
SOLID and TDD, the two topics juniors are asked about most in interviews and then use in every first code review,
had a single scope each (`clean-code/solid`, `testing/tdd-pyramid`) with about six questions.

## Options considered

1. **Extend `technical-interview-preparation`.** It is Advanced and graph/DP heavy: a junior would face material they
   will not be asked and it would not cover soft skills.
2. **One big "Junior" roadmap.** It would duplicate `junior-software-engineer` and mix the job search with life after
   the offer.
3. **Two focused skill tracks that share the SOLID and TDD modules**, plus a new topic for the career content.

We chose **3**.

## Decision

- New topic `junior-career` (14 subtopics, category Career) holds the content that is not technology: STAR and common
  behavioral questions, mistakes and not knowing the answer, offers and negotiation, OOP and web/database interview
  questions, live-coding communication, onboarding, reading unfamiliar code, asking for help, feedback and growth, and
  small pull requests, receiving review feedback and reviewing as a junior.
- SOLID got four new scopes (`clean-code/solid-*`) and TDD seven (`testing/tdd-*`). The old scopes stay where they are
  (`design-principles`, `testing-strategy`), since a scope has exactly one owning module.
- Seven new modules: `solid-in-practice`, `tdd-fundamentals`, `tdd-in-practice` (all `Core`, shared by both roadmaps),
  and `behavioral-interview`, `junior-technical-interview`, `onboarding-and-first-90-days`, `pull-requests-for-juniors`
  (`Context`, one roadmap each). `test-doubles-and-design` and `design-principles` became `Core`, because the new tracks
  offer them as optional modules and the kind follows reuse.
- Two `SkillTrack` roadmaps, both `new`:
  - **Junior Interview Preparation** (`junior-interview-preparation`): the two interview modules, the array and SQL
    drills that already exist, and the three SOLID/TDD modules. It leaves out graphs, backtracking, dynamic programming
    and greedy work on purpose.
  - **Your First 90 Days** (`first-90-days`): onboarding, pull requests, Git collaboration, testing essentials and the
    same SOLID/TDD modules, with code review and mentoring as optional next steps.
- 200 new bilingual questions (8 per scope, with at least 5 at the difficulty the step ramp asks for: ADR-0014) and
  study resources for every new module and roadmap (ADR-0020).
- `JUNIOR_TOP` is unchanged: the six ranked roadmaps stay as ADR-0015 left them. Ranking the interview track is a
  separate product decision.

## Consequences

- The content is multiple choice, so soft-skill topics are taught as "pick the best response" scenarios. They do not
  replace practising an interview or writing a CV; that would need new features, not more questions.
- Behavioral and career advice is not hard fact. Questions keep to widely accepted practice, avoid country-specific
  legal or salary claims and use gender-neutral wording.
- `tests` in `scripts/seed-src/test_junior_career_roadmaps.py` pin the composition (SOLID/TDD in both roadmaps, no
  graph/DP in the interview track) and the question volume per scope, so the tracks cannot lose their depth silently.
- Adding the questions raised the README catalog count by 200; regenerate it with `readme_catalog.py` after any change.
