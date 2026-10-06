# ADR-0016: Language-neutral computer-science fundamentals

**Status:** Accepted · Builds on ADR-0012 (module catalog) and ADR-0015 (roadmaps recommended for juniors)

## Context

Computer Science Fundamentals, the second roadmap recommended for juniors, is built from the `programming-fundamentals`
topic and the `data-structures` arrays, strings and hash tables scopes (also shared with Junior Software Engineer and
Data Structures and Algorithms). About two thirds of its questions were written in C#, Java, Python, JavaScript, C++,
Go or Rust, and many tested the quirks of one language (Java's `%` sign, Python's mutable default arguments, C#'s
`ref`) rather than computer science. A learner of another language could not answer them, and the language roadmaps
missed questions that belonged to them.

## Decision

- **Fundamentals scopes are language-neutral.** Their questions use pseudocode or prose and never name a programming
  language in the title, question or options. `validate_questions.py` enforces it (`NEUTRAL_SCOPES`), in English and
  Portuguese; explanations may still cite languages as examples.
- **Language behaviour lives in the language's topic.** Of the 101 questions in those scopes, 38 that test one
  language moved to that language's topic (and module), 39 that teach a universal concept were rewritten in pseudocode
  with the same id and correct option, and 24 were already neutral. 41 new neutral questions keep every scope at or
  above its previous size. Four moved questions would have duplicated questions their language already had, so they
  were rewritten to cover new language points.
- **Java gets a `language-basics` subtopic** (integer division, remainder sign, `floorMod`, boxed `Integer` identity,
  `String ==`, fixed-length arrays), as the first step of the Java Core module.
- **The seed moves existing questions.** A seeded question no admin edited now follows the seed file's topic and
  subtopic too, not only its text, so production databases pick up the moves on the next start.

## Consequences

- Questions keep their ids, so learners' answers and translations stay attached. Steps already completed stay
  completed. XP already earned stays in the topic where it was earned.
- Some moved ids keep a `pf-`/`ds-` prefix inside a language topic; ids are stable keys, not labels.
- Java Core gains a step (module version bump): learners who completed it see it as new content.
