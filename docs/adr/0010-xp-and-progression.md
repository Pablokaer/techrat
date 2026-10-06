# ADR-0010: XP ledger and progression rules

**Status:** Accepted

- Every XP change is an `XPTransaction` (reason, source type, source id, topic). User and topic totals are projections; weekly/monthly leaderboards sum the ledger.
- Default XP: Easy 10, Medium 25, Hard 50, Expert 100, roadmap step 50, module 150, roadmap 1000, daily streak 5, daily challenge 100 — all configurable (`Gamification` section); per-question and per-step XP are stored and admin-editable.
- **XP is granted once per question** (first correct answer) to prevent farming; repeated practice still updates accuracy statistics.
- Level curve: finishing level L costs `100 + 50·(L−1)` XP (cumulative 100, 250, 450, 700, 1000…), implemented once in `LevelService`/`LevelCurve` and used for global and per-topic levels.
- Roadmap steps complete only when the learner has answered at least `MinimumQuestions` distinct questions in the step's scope with `MinimumAccuracy`% using their latest attempt per question. Opening a step never completes it. Steps unlock sequentially; roadmaps can require a percentage of prerequisite roadmaps.
