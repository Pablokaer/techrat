# ADR-0011: Internationalization (English + Brazilian Portuguese)

**Status:** Accepted

TechRat serves English (`en`) and Brazilian Portuguese (`pt-BR`). Every learner-facing text must exist in both languages (see `CLAUDE.md`).

**Language selection.** The first visit follows the browser language: any Portuguese tag maps to `pt-BR`, anything else to English. An explicit choice (EN/PT toggle) is stored in the `techrat-locale` cookie, which the Next.js server reads to render the right language (no flash, `<html lang>` correct), and in `localStorage` for the desktop static export, which has no server and detects the language on the client. We don't use locale-prefixed routes (`/pt/...`): they don't work with the desktop static export and the app has no SEO-relevant public pages.

**UI strings.** Plain typed objects per namespace (`apps/web/src/i18n/messages/<locale>/<namespace>.ts`) instead of an i18n library: no dependency, no runtime parsing, and messages with variables or plurals are functions, so `pt-BR` is type-checked against `en` (a missing key or a wrong parameter fails `tsc`). Numbers, dates and durations use `Intl` through `useFormat()`. Shared validation messages stay in `@techrat/validation` (unchanged for mobile) and are translated by key on the web.

**API.** The client sends `Accept-Language`; ASP.NET Core request localization sets the request culture (`en`, `pt-BR`, `pt`). The backend owns its texts (ADR-0007): validation and error messages, Identity errors (a localized `IdentityErrorDescriber`), recommendation reasons and emails come from `Text` in `Localization.cs`, which keeps both languages side by side and is checked by a parity test. Background work has no request language, so achievement notifications store the achievement code and are rendered in the reader's language when listed.

**Catalog content.** Topic, subtopic, roadmap, module, step and achievement texts are translated in one table, `content.content_translations (entity_type, entity_id, locale, field, value)`, instead of per-language columns, so adding a language needs no schema change. The entity keeps the base (English) text; a missing translation falls back to it. Services keep caching the base catalog once and apply a per-locale translation dictionary (cached) after reading it. Translations are seeded from `Seed/Data/i18n/<locale>.json`, keyed by natural keys (slug, code, order); like the rest of the seed, only missing rows are inserted.

**Consequences.** The admin area edits the English text only; translations change through the seed file until an editor exists. Questions are not covered yet: storing and serving question translations is the next step required by the bilingual rule.
