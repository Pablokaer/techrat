# TechRat question authoring guide

Output: a JSON array written to `backend/TechRat.Infrastructure/Seed/Data/questions/<group>.json`.

Each item has EXACTLY these keys:

```json
{
  "id": "ds-arrays-index-access",          // kebab-case, globally unique, prefix with a short topic code
  "topic": "data-structures",               // topic slug from topics.json
  "subtopic": "arrays",                     // subtopic slug from that topic
  "difficulty": "Easy",                     // Easy | Medium | Hard | Expert
  "title": "Array index access",            // <= 80 chars, short label
  "question": "What is the time complexity of reading arr[i] in a contiguous array?",
  "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
  "correctIndex": 0,                        // 0..3
  "explanation": "Teach WHY the answer is right and why the plausible distractors are wrong (2-4 sentences).",
  "referenceUrl": "https://..."            // official documentation, must resolve
}
```

Rules
- Exactly one correct option; all four options plausible, similar length and style. No "all of the above"/"none of the above".
- Options are shown in a random order per session (ADR-0019). Never refer to an option by its position ("option B", "the first option", "a última alternativa") in the title, question or explanation; name its content instead (`validate_questions.py` rejects it). "All/None of the above" would keep its position, but avoid them anyway (rule above).
- Spread correctIndex evenly across 0,1,2,3 (roughly 25% each). Do not always put the answer first.
- Computer-science fundamentals are language-neutral (ADR-0016): questions in `programming-fundamentals/*` and `data-structures/{arrays,strings,hash-tables}` teach concepts that hold in any language. Write code as pseudocode (`function f(x)`, `for i from 0 to n - 1`, `if ... then`, `a[i]`, `length(a)`) and never name a language in the title, question or options (`validate_questions.py` rejects it; the explanation may cite languages as examples). A question about one language's behaviour (Java's `%` sign, Python's mutable defaults, C#'s `ref`) belongs to that language's topic.
- Difficulty mix per topic: ~30% Easy, ~35% Medium, ~25% Hard, ~10% Expert.
  - Easy: fundamentals, terminology, syntax, essential concepts.
  - Medium: practical application, comparisons, implementation choices, simple debugging.
  - Hard: architecture, performance, concurrency, edge cases, tradeoffs.
  - Expert: distributed systems, advanced optimisation, internals, architecture decisions, production incidents.
- Prefer scenario questions over memorised definitions, especially for Medium+ (e.g. "An API's p95 jumped to 4s after a feature started loading Orders per User in a loop. What is the most likely problem?").
- Every subtopic of your topics must have at least 2 questions; important subtopics should have 3-5.
- No near-duplicates. Each question must test a distinct piece of knowledge. Never wrap an existing question in generic framing ("A newcomer asks the team…", "Which answer should the team record?") or title prefixes ("Core knowledge:", "Practical review:"): the validator strips the framing before comparing, so such copies are rejected as duplicates.
- Code inside question text is allowed (use \n for newlines). Keep it short.
- Technically accurate as of 2026. If unsure about a fact, do not write that question.
- Written in English, with a Brazilian Portuguese translation of every question (CLAUDE.md): `backend/TechRat.Infrastructure/Seed/Data/i18n/questions/<group>.pt-BR.json`, entries `{"id", "title", "question", "options" (same order), "explanation"}`. Code, identifiers and anything in backticks stay byte-identical; keep product names and common dev jargon.
- Answer-length bias: in each file (English and Portuguese) the correct option may be the strictly longest option in at most 35% of the questions (aim for ≤ 30%, without making it the shortest most of the time).

Reference URLs
- NEVER invent URLs. Prefer official docs: Microsoft Learn, MDN, PostgreSQL docs, Docker docs, Kubernetes docs, git-scm.com, docs.python.org, react.dev, nodejs.org, typescriptlang.org, AWS/Azure/Google Cloud docs, OWASP, RFC Editor (rfc-editor.org), opentelemetry.io, redis.io, mongodb.com/docs, kernel.org docs, docs.github.com, docs.oracle.com / dev.java, spring.io, kafka.apache.org, platform.openai.com/docs or docs.anthropic.com / modelcontextprotocol.io, scikit-learn.org, terraform/developer.hashicorp.com, sre.google (SRE book), martinfowler.com (for patterns/architecture), refactoring.guru only if nothing official exists.
- You MAY use a deep link only if you verify it: run `curl -sS -o /dev/null -w "%{http_code}" -L "<url>"` and it returns 200. Otherwise use the documentation root of that technology (also verified).
- Verify every distinct URL you use (batch them in a small shell loop).

Validation (must pass with 0 errors before you finish):
    python3 scripts/seed-src/validate_questions.py backend/TechRat.Infrastructure/Seed/Data/questions/<group>.json

Then regenerate the README catalog (question counts per topic and per roadmap), which CI checks:
    python3 scripts/seed-src/readme_catalog.py
