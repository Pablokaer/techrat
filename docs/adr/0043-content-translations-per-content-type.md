# ADR-0043: Content translations are applied per content type, not per field

**Status:** Accepted · Changes where and how ADR-0011's translation dictionary is applied; ADR-0011's storage (one
`content_translations` table) and mechanism (services apply a per-locale dictionary after reading the English rows) are
unchanged

## Context

`ContentTranslations` exposed one accessor per field (`TopicName`, `TopicDescription`, `TopicCategory`, `RoadmapName`,
`RoadmapDescription`, `StepTitle`, `StepDescription`, `AchievementCategory`, `QuestionExplanation`, … 18 in all). The
services in nine Application modules called them field by field, passing the entity id and the English fallback each
time. A DTO that gained a field (a module's description, a roadmap's category) had to remember a new translation call,
and nothing tied the accessors to what the seed actually translates.

## Decision

- **The translatable fields of every content type are declared once**, in `TranslatableContent.Fields`
  (`Application/Common/Localization.cs`), next to a `*Texts` record per type: `TopicTexts` (name, description,
  category), `RoadmapTexts` (same), `ModuleTexts` (name, description), `StepTexts` (title, description),
  `AchievementTexts` (name, description, category) and `QuestionTexts` (title, text, explanation). Subtopics and options
  have one text each (name, text).
- **Callers translate a content item:** `tr.Topic(id, new(name, description, category))` returns all of the topic's
  texts in the request language, each falling back to English when its translation is missing or blank (as before).
  Services read the translated fields from that record instead of calling one accessor per field.
- **Label accessors stay for references.** Where a response only names another item (a roadmap under "used in", the
  topic of a question, a question title in the Learn list), loading the other texts would only widen the query, so
  `TopicName`, `SubtopicName`, `RoadmapName`, `ModuleName`, `StepTitle`, `QuestionTitle` and `OptionText` remain. The
  eleven description/category/text accessors are gone, and the generic `Get` is private.
- **The two loaders are unchanged**: `LoadAsync` (catalog, cached through `CacheEntries.Translations`) and
  `LoadQuestionsAsync` (questions and options, per request). The two `LoadQuestionsAsync` calls in `PracticeService` are
  in different requests (reading a session, grading one answer), so there is no double load to remove.

## Consequences

- `ContentTranslationsTests` checks every content type through the real interface (translated, missing → English,
  English locale untouched), that each `*Texts` record has exactly the declared fields, and that every field in
  `Seed/Data/i18n/pt-BR.json` and in the question translation files is declared, so a seeded translation cannot be
  silently ignored.
- Adding a translatable field means adding it to the seed file, to `TranslatableContent.Fields` and to the type's
  `*Texts` record; the tests fail until all three agree. Callers that use the record get it without further changes.
- Two queries now also read the roadmap description (search, profile roadmap summaries) so the roadmap can be translated
  as one item; the responses are unchanged.
