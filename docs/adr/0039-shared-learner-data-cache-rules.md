# ADR-0039: One shared module for the learner's cached data

**Status:** Accepted · Builds on ADR-0004 (web stack) and ADR-0005 (React Native / Expo)

## Context

The web app (`apps/web/src/lib/queries.ts`) and the mobile app (`apps/mobile/src/lib/queries.ts`) both cache the
learner's data with TanStack Query, and each kept its own query keys, its own list of what becomes stale after the learner
answers or starts a roadmap, and its own copy of "send the answer, then put the new level and streak into the cached
learner". The copies drifted:

- the web list never refreshed topic progress, and the web Learn page built its key inline (`["topic-progress"]`), so the
  topic cards kept the old count after a session; mobile did refresh it;
- the roadmap list was `["roadmaps", category]` on the web and `["roadmaps"]` on mobile;
- other screens (admin, sign-in providers) built keys inline that no list knew about.

`ApiClientOptions.onUnauthorized` in `@techrat/api` was documented but never read.

## Decision

- **`@techrat/api` owns the learner-data cache rules** (`packages/api/src/learning.ts`), the package both apps already
  use (transpiled by Next and by jest-expo, copied by the web Dockerfile); no new package:
  - `learnerKeys`: one key factory for the learner's data, `topicProgress` included;
  - `refreshAfterAnswer(queryClient)`: everything an answer can change (the union of the old web and mobile lists plus
    topic progress), called when a session ends and when the server reports an achievement;
  - `refreshAfterRoadmapStart(queryClient, slug, roadmap)`: stores the started roadmap, refreshes the roadmap lists and
    the dashboard;
  - `submitAnswer(queryClient, send, sessionId, answer)` with `answerSender(api)`: sends the answer and applies the
    result to the cached learner; both question players call it (the web player can inject `send` in tests).
- **The query client is typed structurally** (`LearnerCache`: only `invalidateQueries` and `setQueryData`), so the package
  does not depend on `@tanstack/react-query`; its tests use a real `QueryClient` from `@tanstack/query-core` (dev only).
- **Hooks stay in each app** (the web binds a singleton client, mobile uses `ApiProvider`), but they use the shared keys.
  Web-only keys (admin, sign-in providers) live in the web key factory (`qk`), which spreads `learnerKeys`; no screen
  builds a key inline.
- The dead `onUnauthorized` option is removed: 401 handling stays where it is (the bearer session's refresh and the
  apps' query-cache error handlers).

## Consequences

- A new screen of learner data gets refreshed after answering by using a shared key; a change to what goes stale is made
  once and covered by `npm test -w @techrat/api`.
- The web Learn page now shows the new topic progress after a session, as mobile did.
- Mobile's roadmap list key is now `["roadmaps", "all"]`; invalidation by the `["roadmaps"]` prefix is unchanged.
