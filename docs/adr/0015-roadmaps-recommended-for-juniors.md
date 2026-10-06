# ADR-0015: Curated roadmaps recommended for juniors

**Status:** Accepted · Builds on ADR-0007 (backend owns business rules) and ADR-0012 (module catalog)

## Context

The catalog has 43 roadmaps. A junior developer looking for a first job could not tell which of them to start with:
the list only filtered by category, and categories mix beginner paths with advanced ones (Career holds both Junior and
Senior Software Engineer). The beginner steps of the paths juniors need most also had only about two Easy questions
per scope, so a junior repeated the same questions quickly.

## Options considered

1. **Derive it from the roadmap difficulty** (every `Beginner` roadmap). Data Analyst and AWS Fundamentals are
   Beginner but are not what a junior software developer needs first, while Data Structures and Algorithms is
   Intermediate and central to junior interviews.
2. **Hard-code the list in each client.** Web and mobile would drift and the backend would not know the rule.
3. **Curate a ranked list in the seed and expose it from the API.**

We chose **3**.

## Decision

- `roadmaps.py` holds `JUNIOR_TOP`, the platform's top 6 roadmaps for a junior software developer, most recommended
  first: Junior Software Engineer, Computer Science Fundamentals, Git and Collaboration, JavaScript Developer, SQL,
  Data Structures and Algorithms. Language-neutral foundations come first, then the daily tools, the most used
  language for a first job and the data structures and algorithms that junior interviews test.
- `roadmaps.json` carries `juniorRank` (1–6, or null). The seed copies it to `Roadmap.JuniorRank` on every start, also
  for roadmaps whose composition an admin changed: the recommendation is curated in the seed only.
- `GET /api/v1/roadmaps` returns `juniorRank` on every `RoadmapSummaryDto`. The web roadmap list has a
  "Recommended for juniors" filter tab (only ranked roadmaps, in rank order) and a "#N for juniors" badge on their cards.
- The six roadmaps got 72 new bilingual questions (12 each, mostly Easy/Medium), in the beginner scopes they use.
- Junior Software Engineer, the entry path, also offers the beginner modules of the other junior roadmaps it lacked
  as **optional** modules: `git-collaboration`, `javascript-core`, `linear-data-structures` and `how-computers-work`.
  It now reaches 58 of the 72 new questions (40 before) while its required steps, estimate and learners' percentages
  stay the same. The last three modules became `Core`, since two roadmaps now share them.

## Consequences

- Changing the recommendation is a seed change (edit `JUNIOR_TOP`, regenerate, deploy); there is no admin screen for it.
- The README catalog lists the recommended roadmaps, so the curated list stays visible in reviews.
- The mobile app receives `juniorRank` but has no filter yet: its screens are not translated, and the filter label must
  exist in both languages.
