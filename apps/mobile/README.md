# TechRat Mobile (`@techrat/mobile`)

React Native app for TechRat, built with **Expo SDK 57** and **expo-router**. It shares API contracts,
the API client, auth, validation and design tokens with the web app through the `@techrat/*` workspace packages.

## Stack

| Concern    | Choice |
| ---------- | ------ |
| Runtime    | Expo SDK 57 · React Native 0.86.3 · React 19.2.3 |
| Navigation | expo-router (`src/app`), tab bar Home / Learn / Practice / Roadmaps / Profile |
| Data       | `@tanstack/react-query` + the typed `openapi-fetch` client from `@techrat/api` |
| Auth       | `BearerSession` from `@techrat/auth`, with tokens kept in `expo-secure-store` |
| Forms      | `loginSchema` / `registerSchema` from `@techrat/validation` |
| Styling    | `StyleSheet` + tokens from `@techrat/theme` (no hard-coded colors) |
| Tests      | Jest (`jest-expo`) + `@testing-library/react-native` 14 |

## Prerequisites

- Node 22+, with npm workspaces run from the repo root (`npm install` at the root installs this app too).
- A running backend (default port `5080`). See the repo root README.
- For a device: the **Expo Go** app (SDK 57). For emulators: Android Studio or Xcode.

## Configure the API URL

The app reads `EXPO_PUBLIC_API_URL` when it is built. **Release builds require it**, and it must be an `https://`
URL: a build without it (or with plain HTTP) refuses to start instead of falling back to the emulator or localhost
(`src/lib/config.ts`). The `preview` and `production` EAS profiles set it to `https://techrat.io`.

In development, if it isn't set, the app uses:

- Android emulator: `http://10.0.2.2:5080` (the emulator's alias for your machine's localhost)
- iOS simulator and other targets: `http://localhost:5080`

On a physical phone with Expo Go, point it at your machine's LAN IP:

```bash
# apps/mobile/.env.local  (git-ignored)
EXPO_PUBLIC_API_URL=http://192.168.1.20:5080
```

The backend must listen on that interface (for example `ASPNETCORE_URLS=http://0.0.0.0:5080`) and allow plain HTTP during development.

`EXPO_PUBLIC_WEB_URL` (optional) is the website that serves the privacy policy, terms and account-deletion pages the app
opens. Release builds default to the API URL, because the API is served behind the website's origin
(`https://techrat.io`). In development, point it at the web dev server, for example `EXPO_PUBLIC_WEB_URL=http://localhost:3000`
(the API port does not serve pages). Like the API URL, it is inlined when the app is built.

## Run

```bash
# from the repo root
npm install

cd apps/mobile
npm start            # Expo dev server: scan the QR code with Expo Go
npm run android      # open in a running Android emulator
npm run ios          # open in the iOS simulator (macOS)
```

## Scripts

| Script                   | What it does |
| ------------------------ | ------------ |
| `npm start`              | `expo start` (Metro dev server) |
| `npm run android` / `ios` | Start and open on an emulator or simulator |
| `npm run typecheck`      | `tsc --noEmit` (also type-checks the shared workspace sources this app imports) |
| `npm test`               | Jest: pure helper tests and the question-flow test (mocked API) |
| `npm run export:android` | Production Metro bundle into `dist/` (shows the monorepo bundles) |
| `npm run doctor` | `expo-doctor`: SDK-compatible dependency versions, duplicates, config plugins (also a CI step) |
| `npm run check:production-config` | Resolves the public Expo config with the EAS `production` profile's environment and checks the package name, version and https API URL (also a CI step) |
| `npm run assets:android` | Regenerates the launcher icons, themed icon, splash image and Play Store graphics from `assets/rat.png` |

From the repo root, `npm run typecheck` and `npm test` include this workspace.

## Android release (EAS)

`eas.json` has three build profiles:

| Profile | Output | For |
| --- | --- | --- |
| `development` | development client (`apk`, internal) | day-to-day work on a device |
| `preview` | installable `apk` (internal distribution), `EXPO_PUBLIC_API_URL=https://techrat.io` | testers |
| `production` | `aab` for Google Play, `EXPO_PUBLIC_API_URL=https://techrat.io`, `versionCode` auto-incremented | the store |

* Package name and iOS bundle id: `io.techrat.app` (it can never change after the first Play upload).
* `version` in `app.json` is the version users see; `versionCode` belongs to EAS (`appVersionSource: "remote"`).
* The merged Android manifest asks for `INTERNET`, `VIBRATE` and `CAMERA` only; the microphone, legacy external storage and
  the overlay permission are blocked in `app.json`. Release builds block cleartext HTTP.
* The EAS archive is the whole monorepo, filtered by the root `.easignore`.

Everything else (accounts, signing, the Play Console, the checklist) is in [`docs/android-release.md`](../../docs/android-release.md).

## Account deletion, privacy and languages

* **Delete account** (Profile → Delete account, `src/app/delete-account.tsx`): asks for the password (or the username, for accounts
  without one), requires a second confirmation, calls `DELETE /api/v1/account` through `BearerSession.deleteAccount`, and the
  sign-out returns the app to the login screen. Design: [ADR-0023](../../docs/adr/0023-account-deletion.md).
* **Privacy policy and Terms of service** open the public web pages in the in-app browser from Profile and from the register screen.
* **Languages:** the screens written for the Play release (the version label, delete account, the legal rows and the register
  consent line) are available in English and Brazilian Portuguese through `src/lib/i18n.ts` (the device language; every API request
  also sends `Accept-Language`). The rest of the app is still English-only. Add new texts to both languages: a test fails when
  they differ.

## Monorepo notes

- `metro.config.js` uses `getDefaultConfig` from `expo/metro-config`. Since SDK 52 it sets up npm workspaces
  automatically: `watchFolders` includes the repo root, and `nodeModulesPaths` covers both the app's and the root's `node_modules`.
  The `@techrat/*` packages are TypeScript sources (`"main": "src/index.ts"`) symlinked into the root `node_modules`,
  and Metro transpiles them like app code.
- Jest's `transformIgnorePatterns` lets `@techrat/*`, `openapi-fetch` and `zod` through Babel for the same reason.
- `react-native-reanimated`, `react-native-worklets` and `react-native-gesture-handler` are pinned to the SDK 57 versions.
  They are peers of expo-router's drawer, and without the pins npm would install newer releases that don't match Expo Go's native code.

## Layout

```
src/
  app/                    expo-router routes
    _layout.tsx           providers + auth guard (Stack.Protected)
    login.tsx, register.tsx
    (tabs)/               index (Home), learn, practice, roadmaps, profile
    topic/[slug].tsx      topic detail → start practice
    roadmap/[slug].tsx    modules (shared / optional / capstone badges, credit from other roadmaps), steps, start, practice
    session/[id].tsx      question player + summary
    leaderboard.tsx       Global / Weekly / Monthly
    change-password.tsx, delete-account.tsx, avatar-crop.tsx
  components/
    ui/                   primitives (AppText, Button, Card, Chip, ProgressBar, …)
    domain/               TopicIcon, StepRow, ModuleHeader, RoadmapCard, LevelSummary, TopicProgressCard
    question/             QuestionPlayer, OptionItem, FeedbackPanel, SessionSummary
    auth/                 form hook and header
  lib/                    config, session, API context, queries, pure helpers
```
