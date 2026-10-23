# TechRat for Kindle (KOReader plugin)

Practise TechRat on a jailbroken Kindle that runs [KOReader](https://koreader.rocks): pick a topic, a roadmap step or
the daily challenge and answer its questions on the e-ink screen. Answers are graded by the TechRat server, so your XP,
level, streak and roadmap progress are the same as on the web and the Android app ([ADR-0044](../../docs/adr/0044-kindle-koreader-plugin.md)).
TechRat opens on its own full-screen screens drawn for e-ink ([ADR-0045](../../docs/adr/0045-kindle-own-screens.md)).

It needs the internet while you play. There is no offline mode: the Kindle never receives the right answer before you
answer.

Without a connection:

- **Opening TechRat** still shows the home, with a "No connection" notice and the level, XP and streak saved the last
  time they were fetched. It does not ask for Wi-Fi just to open.
- **Playing** (a card, a topic, a step, an answer) asks *"TechRat needs the internet for this. Turn Wi-Fi on?"*:
  **Turn Wi-Fi on** connects and carries on; **Not now** leaves the screen as it was. If KOReader is set to turn Wi-Fi
  on by itself (*Network → Action when Wi-Fi is off*), TechRat leaves that to KOReader.
- **On a Wi-Fi without internet**, or when the server does not answer, it says *"Could not reach TechRat…"*. During a
  question, the question and your selected option stay on screen: tap **Answer** again once the connection is back.

Signing out also forgets the saved level and XP.

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
   management*. It opens TechRat's home screen.
8. Tap **Sign in** and type your TechRat email and password (once; the session renews itself). The account must have
   a password and a confirmed email.

To update, replace the folder with the new one and restart KOReader. **Sign out** on the home screen forgets the
tokens kept on the Kindle (`koreader/settings/techrat.lua`).

## How to play

The home screen shows your level, XP, progress to the next level and streak, and three cards:

- **Daily challenge**: today's questions (and their bonus XP).
- **Topics**: choose a topic and 5, 10 or 20 questions.
- **Roadmaps**: a roadmap you have not started offers to start it; then its current steps can be practised (10
  questions, as on the web). Completed and locked steps are listed but cannot be opened.

A question fills the screen: the topic, difficulty and progress at the top, then the text (long ones scroll) and the
options A–D as large boxes. Tap one to select it and **Answer** to send it. The next screen says whether it was right,
with your answer, the correct one, the explanation and the XP earned; the last one shows the score, the XP of the
session and your level.

**Language** on the home screen switches between English and Português (Brasil), for the screens and for the questions
the server sends. Until you pick one, TechRat follows KOReader's language (Portuguese if KOReader is in Portuguese,
English otherwise).

## Development

- `techrat.koplugin/` is the plugin. `main.lua` is the flow (what to show next, which request to make) and builds a
  plain table per screen; `techrat_ui.lua` draws those screens with KOReader widgets (`logo.png` is the rat in black
  and white). `techrat_api.lua` (requests and the session), `techrat_game.lua` (where you are in a session) and
  `techrat_i18n.lua` (texts in en and pt-BR) do not depend on KOReader. `techrat_transport.lua` is the HTTPS layer
  with KOReader's luasocket and JSON.
- Tests: `luajit apps/kindle/tests/run.lua` (LuaJIT 2.1, the interpreter KOReader uses). `test_main.lua` loads the real
  `main.lua` with `techrat_ui` replaced by a recorder and plays whole sessions, reading what each screen was asked to
  show and tapping its callbacks.
- **Seeing the screens**: `apps/kindle/dev/emulator.sh` (Linux, or Ubuntu on WSL with WSLg) downloads KOReader once
  into `~/koreader-emu` and opens it in a Kindle-sized grayscale window on TechRat's home, signed in with sample data
  (`dev/preview`, never shipped), so no account or network is needed. `emulator.sh shots DIR` walks through every
  screen, saves a PNG of each into `DIR` and quits. `KINDLE_W`, `KINDLE_H`, `KINDLE_DPI` and `TECHRAT_LANG` (`pt_BR`
  or `en`) change the window and the language.
- CI (`.github/workflows/kindle-plugin.yml`) runs the tests and builds the zip; on `main` it publishes the release named
  after `version` in `_meta.lua`. Bump that version to publish a new release.
