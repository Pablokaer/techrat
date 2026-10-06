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

The app reads `EXPO_PUBLIC_API_URL` when it is built. If it isn't set, the app uses:

- Android emulator: `http://10.0.2.2:5080` (the emulator's alias for your machine's localhost)
- iOS simulator and other targets: `http://localhost:5080`

On a physical phone with Expo Go, point it at your machine's LAN IP:

```bash
# apps/mobile/.env.local  (git-ignored)
EXPO_PUBLIC_API_URL=http://192.168.1.20:5080
```

The backend must listen on that interface (for example `ASPNETCORE_URLS=http://0.0.0.0:5080`) and allow plain HTTP during development.

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

From the repo root, `npm run typecheck` and `npm test` include this workspace.

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
    roadmap/[slug].tsx    modules, steps, start roadmap, practice step
    session/[id].tsx      question player + summary
    leaderboard.tsx       Global / Weekly / Monthly
  components/
    ui/                   primitives (AppText, Button, Card, Chip, ProgressBar, …)
    domain/               TopicIcon, StepRow, LevelSummary, TopicProgressCard
    question/             QuestionPlayer, OptionItem, FeedbackPanel, SessionSummary
    auth/                 form hook and header
  lib/                    config, session, API context, queries, pure helpers
```
