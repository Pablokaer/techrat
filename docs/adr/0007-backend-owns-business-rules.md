# ADR-0007: The backend owns every business rule

**Status:** Accepted

Grading, XP amounts, level curves, streaks, roadmap step criteria and unlocking, achievements, leaderboards and daily-challenge bonuses are computed only in the API. Clients never receive `isCorrect` flags before answering and never compute XP.

Contracts are generated, not copied: the API publishes OpenAPI (`/openapi/v1.json`), and `scripts/generate-api-client.sh` regenerates `packages/types/src/schema.d.ts` with `openapi-typescript`; `@techrat/api` wraps it with `openapi-fetch`. Client-side zod schemas only improve UX and mirror server validation.
