# ADR-0028: Study library on the topic page

**Status:** Accepted · Builds on [ADR-0020](0020-study-resources.md) (study resources)

## Context

Curated reading existed per roadmap and per module (ADR-0020), but the Learn tab, where a learner picks a topic such as
Data Structures, only offered questions. Someone studying a topic had to know which module to open to find a book or
an official page. Every question also carries a `referenceUrl`, so a topic already points to many official pages that
no screen collected.

## Decision

- **No new content to curate.** A topic's library is derived from data we already keep and check:
  1. the curated reading (`resources.json`) of every published module that has an active step in the topic, in catalog
     order, shown under the module that owns it;
  2. the official pages cited by the topic's active questions, grouped by subtopic and counted, most relied-on first,
     with one question title as an example.
- **A link appears once.** Modules share sources, so a URL is listed where it first appears (`TopicLibrary.MergeModules`)
  and `totalLinks` counts distinct links across both parts. Pure rules live in `TopicLibrary` and are unit tested.
- **API:** `GET /api/v1/topics/{slug}/resources` (`TopicResourcesDto`). Unknown or inactive topics are 404. Module and
  subtopic names, study-topic names, notes and question titles come in the request language.
- **Web:** a "Study library" card on the topic page, between the subtopics and the questions. Curated reading is
  grouped by module (only the first module is open, because a topic can have dozens of links) with a link to the module
  page; cited pages are collapsed per subtopic. External links reuse the study-resources list (type and language
  badges, new tab with `rel="noopener noreferrer"`).
- **Only https links** from questions are listed; blank, malformed or non-https references are ignored.

## Consequences

- Every active topic must be taught by a module that has curated reading; an integration test fails otherwise, so a
  new topic ships with its reading (as for roadmaps and modules in ADR-0020).
- Some modules span two topics (for example graph basics in both Data Structures and Algorithms), so their reading shows
  in both libraries. The module name above each block tells the learner where it comes from.
- Cited pages inherit the quality checks of `validate_questions.py` and `--check-urls`; nothing new can rot unnoticed.
- Mobile does not show the library yet.
