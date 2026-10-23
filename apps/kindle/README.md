# TechRat for Kindle (KOReader plugin)

Practise TechRat on a jailbroken Kindle that runs [KOReader](https://koreader.rocks): pick a topic, a roadmap step or
the daily challenge and answer its questions on the e-ink screen. Answers are graded by the TechRat server, so your XP,
level, streak and roadmap progress are the same as on the web and the Android app ([ADR-0044](../../docs/adr/0044-kindle-koreader-plugin.md)).

It needs Wi-Fi while you play (KOReader offers to turn it on). There is no offline mode: the Kindle never receives the
right answer before you answer.

## Install

1. Download `techrat.koplugin-<version>.zip`: from the repository's **Releases** page (`koplugin-v<version>`), or, for
   a version still in review, from the **Artifacts** of the "Kindle plugin" run of its pull request.
2. Unzip it. You get a folder called `techrat.koplugin` (with `_meta.lua` and `main.lua` inside).
3. Connect the Kindle to the computer with the USB cable. It shows up as a drive.
4. Copy the whole `techrat.koplugin` folder into `koreader/plugins/` on that drive, next to the other `*.koplugin`
   folders.
5. Eject the Kindle safely and unplug it.
6. Restart KOReader (menu → *Exit* → *Restart KOReader*).
7. Open the top menu, then the tools tab (🔧): **TechRat**. If it is not there, enable it in *More tools → Plugin
   management*.
8. **Sign in** with your TechRat email and password (once; the session renews itself). The account must have a
   password and a confirmed email.

To update, replace the folder with the new one and restart KOReader. Signing out (TechRat → *Sign out*) forgets the
tokens kept on the Kindle (`koreader/settings/techrat.lua`).

## How to play

- **Topics**: choose a topic and 5, 10 or 20 questions.
- **Roadmaps**: a roadmap you have not started offers to start it; then its current steps can be practised (10
  questions, as on the web). Completed and locked steps are listed but cannot be opened.
- **Daily challenge**: today's questions (and their bonus XP).
- **My progress**: level, XP and streak.

Each question shows its options as A–D buttons; after answering you see whether it was right, the correct option and
the explanation. The plugin follows KOReader's language: Portuguese if KOReader is in Portuguese, English otherwise.

## Development

- `techrat.koplugin/` is the plugin. `main.lua` holds the KOReader screens; `techrat_api.lua` (requests and the
  session), `techrat_game.lua` (where you are in a session) and `techrat_i18n.lua` (texts in en and pt-BR) do not
  depend on KOReader. `techrat_transport.lua` is the HTTPS layer with KOReader's luasocket and JSON.
- Tests: `luajit apps/kindle/tests/run.lua` (LuaJIT 2.1, the interpreter KOReader uses). `test_main.lua` loads the real
  `main.lua` with stand-ins for the KOReader widgets and plays a whole session, so screen mistakes fail there.
- CI (`.github/workflows/kindle-plugin.yml`) runs the tests and builds the zip; on `main` it publishes the release named
  after `version` in `_meta.lua`. Bump that version to publish a new release.
