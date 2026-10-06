# TechRat Desktop (Tauri 2)

The desktop app is a thin Tauri shell around the **same React UI as the web app**. `apps/web` is built as a
static export (`BUILD_TARGET=desktop`) in **bearer-token mode** and loaded by Tauri. No business logic or
backend code is duplicated — the app talks to the TechRat API like every other client.

## Prerequisites
- Node 22+, Rust 1.77+ (`rustup`), and the Tauri system dependencies for your OS
  (Linux: `libwebkit2gtk-4.1-dev librsvg2-dev`; see https://v2.tauri.app/start/prerequisites/).
- A running API (default `http://localhost:5080`, see the root README).

## Run
```bash
npm install                      # at the repo root
npm run dev -w @techrat/web      # terminal 1 (desktop dev uses the dev server)
NEXT_PUBLIC_AUTH_MODE=bearer NEXT_PUBLIC_API_URL=http://localhost:5080 npm run dev -w @techrat/web  # bearer mode dev
npm run dev -w @techrat/desktop  # terminal 2
```

## Build installers
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain npm run build -w @techrat/desktop
# Linux example: npx tauri build --bundles deb
```
`beforeBuildCommand` runs `npm run build:desktop -w @techrat/web`, producing `apps/web/out`.

## Security notes
- The API must list the Tauri origins in `Cors:AllowedOrigins` (`tauri://localhost`, `http://tauri.localhost`) — already in `appsettings.json`.
- CSP in `tauri.conf.json` restricts network access to the API hosts; update `connect-src` for your production API.
- Tokens are kept in the webview's app-private storage. Upgrade path: OS keychain via a Tauri plugin (see docs/adr/0006).
- External documentation links open in the system browser through `tauri-plugin-opener`.
