# ADR-0045: The Kindle plugin draws its own full-screen screens

**Status:** Accepted · Revises the screens of ADR-0044 (TechRat on the Kindle as a KOReader plugin)

## Context

Version 0.1 of the plugin (ADR-0044) was built from KOReader's stock dialogs: a menu entry with sub-menus, a
`TextViewer` for each question and a row of A–D buttons. It worked, but it looked like a KOReader settings page rather
than a game, the level and streak were hidden behind "My progress", and a long question shared a small popup with its
options. The language followed KOReader's interface, so a learner reading in one language could not practise in
the other without changing KOReader itself.

## Decision

- **Tapping TechRat opens TechRat's own home screen**, full screen, instead of a sub-menu. It shows the level, XP,
  progress bar and streak, and cards for the daily challenge, topics and roadmaps. Questions, feedback and the session
  summary are full-screen pages too, drawn with KOReader widgets (`FrameContainer`, `TextBoxWidget`, `ProgressWidget`,
  `ImageWidget`…) in `techrat_ui.lua`.
- **Designed for e-ink**: black on white, emphasis by border weight and solid black fills (not shades), large tap
  targets, no animation, and a full refresh on every new screen (a quick one when only the selection changes) so the
  previous screen leaves no ghost. Long lists (topics, steps) keep KOReader's paged `Menu`, which pages better on e-ink
  than a scrolling list, with its keyboard-shortcut badges turned off.
- **The flow and the drawing are split**: `main.lua` decides what to show and builds a plain table per screen;
  `techrat_ui.lua` only draws it. The tests replace `techrat_ui` with a recorder, so whole sessions are played without
  KOReader.
- **The look is checked in the real KOReader**: `apps/kindle/dev/emulator.sh` runs the KOReader AppImage (Linux or WSL
  with WSLg) with a preview plugin that links the plugin's files and answers with sample data, and can save a PNG of
  every screen. The preview is never shipped in the zip.
- **The language is chosen in the app**: a *Language* button on the home switches between English and Português
  (Brasil). The choice is kept in `koreader/settings/techrat.lua` and sent as `Accept-Language`, so the questions follow
  it; without a choice the plugin still follows KOReader's language.
- **Without internet** (added in 0.2.1): the home still opens with the level, XP and streak saved the last time
  `/users/me` answered, under a "No connection" notice, and opening never asks for Wi-Fi. Anything that needs the
  server asks TechRat's own question, in its language, before turning Wi-Fi on: KOReader's prompt gives no sign when
  it is declined and does nothing on a Wi-Fi without internet, which instead gets TechRat's network message. A
  KOReader set to turn Wi-Fi on by itself keeps doing so. Still online only for playing (ADR-0044).

## Consequences

- The plugin now depends on more of KOReader's widget API; CI still does not run KOReader, so a KOReader release that
  changes these widgets is caught by the emulator or on the device, not by the tests.
- The design can be reviewed from screenshots before a device is involved.
- Adding a language means adding its texts to `techrat_i18n.lua` and an entry to `I18n.languages`.
