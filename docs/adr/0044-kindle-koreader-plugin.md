# ADR-0044: TechRat on the Kindle as a KOReader plugin

**Status:** Accepted · Builds on ADR-0007 (the backend owns every rule) and ADR-0030 (single-use refresh tokens)

## Context

The owner plays on a jailbroken Kindle with KOReader and wants to pick roadmaps or topics and answer questions there,
with progress counted like on the web. Options considered:

- **The Kindle's web browser**: too old for the Next.js app; it would need a second, HTML-only site to maintain.
- **An OPDS catalog**: KOReader shows OPDS entries in its own list and only downloads files. A catalog of EPUB
  "gamebooks" (links per option) would work offline, but the file would hold the right answers and nothing would reach
  the server: no XP, no streak, and the answers exposed, against ADR-0007.
- **A KOReader plugin**: Lua, with KOReader's own widgets, luasocket (HTTPS) and JSON; it can call the existing API.

## Decision

- **A KOReader plugin**, `apps/kindle/techrat.koplugin`, copied by hand to `koreader/plugins/`. It is a thin client
  of the existing API, the same one the Android app uses: bearer sign-in (`/auth/login`, `/auth/refresh`, rotation as in
  ADR-0030), `/topics`, `/roadmaps`, `/roadmaps/{slug}/start`, `/practice/sessions` and its answers,
  `/daily-challenge/start`, `/users/me`. **No backend change**: the server grades, the plugin shows.
- **Online only.** The Kindle never receives the correct option before answering, as on every client (ADR-0007).
- **Sign-in with email and password, typed once**, kept as tokens in `koreader/settings/techrat.lua` (plain text on
  the Kindle; signing out deletes them, and ADR-0018's password change ends that session too). A sign-in by code
  approved on the phone is the planned replacement for typing the password on e-ink.
- **Rules follow the web**: a roadmap must be started before its steps, only `Current` steps can be practised (10
  questions), topics take 5, 10 or 20.
- **Testable without KOReader**: requests, session handling and texts are plain Lua modules with the network, clock
  and settings passed in; `main.lua` only builds screens and is exercised by a test that loads it with stand-ins for
  the KOReader widgets. Tests run on LuaJIT 2.1 in CI, installed by an action rather than apt.
- **Texts in en and pt-BR** in the plugin itself (KOReader's gettext only knows KOReader's strings), following
  KOReader's interface language.
- **Delivery**: CI builds `techrat.koplugin-<version>.zip` on every run (artifact) and attaches it to the release
  `koplugin-v<version>` on `main`; `version` lives in `_meta.lua`.

## Consequences

- No server-side work or risk; the plugin breaks only if the API contract changes, which the generated types already
  guard on the other clients (the plugin has no generated types: its tests pin the fields it reads).
- The real KOReader widgets are not exercised by CI; the stand-ins follow KOReader's current API (Menu, TextViewer,
  ButtonDialog, MultiInputDialog, NetworkMgr, LuaSettings), and the first check on a device is manual.
- Typing the password on the Kindle keyboard is clumsy; accounts without a password (external sign-in) cannot use the
  plugin until the sign-in by code exists.
