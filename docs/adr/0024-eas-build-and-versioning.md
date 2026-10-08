# ADR-0024: Android release with EAS Build, remote versioning and a release-safe configuration

**Status:** Accepted · Builds on ADR-0005 (React Native with Expo) and ADR-0023 (account deletion)

## Context

The Android app (`apps/mobile`) had never been built for production. It sits in an npm-workspaces monorepo (it imports
the `@techrat/*` packages), talks to the same API as the web (`https://techrat.io`), and its launcher icon was a 512 px
image reused as the adaptive-icon foreground, which Android crops. Google Play adds requirements of its own: a package
name that can never change, a rising `versionCode`, a restricted permission list, account deletion inside the app and
on the web, and a privacy policy.

## Decisions

- **Build service: EAS Build**, with three profiles in `apps/mobile/eas.json`: `development` (development client,
  internal), `preview` (an installable `apk`, internal distribution) and `production` (an `aab` for Play, with
  `autoIncrement`). Preview and production set `EXPO_PUBLIC_API_URL=https://techrat.io`: the app embeds no secrets, so
  the profile is the right place for a public URL.
- **Identity:** package name and iOS bundle identifier **`io.techrat.app`**, matching the product domain. It replaces
  the placeholder `dev.techrat.app` while nothing had been published; after the first Play upload it is immutable.
- **Versions:** `version` in `app.json` is the user-facing semantic version (**1.0.0** for the first public release;
  the `0.1.0` of the workspace packages is an internal number). `versionCode` is owned by EAS
  (`cli.appVersionSource: "remote"`, `autoIncrement` on production), so it cannot be forgotten or collide.
- **Release-safe API URL:** `resolveApiUrl` keeps the emulator/localhost fallbacks for development only. A release
  build must have an `https://` URL and otherwise throws at startup. A build that silently pointed at `10.0.2.2`
  would be unusable, and one pointed at plain HTTP would send tokens in the clear; Android also blocks cleartext
  traffic in release builds (the `usesCleartextTraffic` flag exists only in the debug manifest), so the explicit
  failure is clearer than a network error.
- **Permissions:** the merged manifest asks for `INTERNET`, `VIBRATE` and `CAMERA` only (profile photo). The
  microphone, the legacy external-storage permissions (declared by `expo-file-system` and `expo-image-picker`; the
  system photo picker needs neither) and the debug overlay permission are blocked in `android.blockedPermissions`.
  `app-config.test.ts` pins these settings so a change is a deliberate one.
- **Monorepo on EAS:** the whole repository is uploaded and installed from the root `package-lock.json` (EAS detects the
  npm workspaces). `.easignore` removes what the app does not need (backend, docs, e2e, deploy, scripts, CI files) but
  keeps every workspace, because `npm ci` fails when a workspace listed in the root `package.json` is missing. No
  `eas-build-pre-install` hook is needed: nothing has to run before the install.
- **Graphics:** `scripts/generate-android-assets.mjs` builds the icons, the monochrome (themed) icon, the splash image
  and the Play listing graphics from `rat.png`, keeping the art inside the 66 dp safe circle (checked by a test), so the
  geometry is reproducible instead of hand-drawn.
- **Localization on mobile:** a minimal `src/lib/i18n.ts` (en, pt-BR, the device locale) serves the screens written for
  the release; the rest of the app stays English-only for now (listed in the README's known limitations). Every API
  request sends `Accept-Language`, so server messages and emails follow the device language.
- **CI checks, no store automation:** the pipeline runs `expo-doctor` and a script that resolves the public Expo config
  with the production profile's environment. Building and submitting stay manual
  ([docs/android-release.md](../android-release.md) explains how to automate them later with an `EXPO_TOKEN`).

## Consequences

- The first release needs people for what code cannot do: Expo and Play accounts, the keystore (created by EAS on the
  first build), screenshots, the reviewer test account and the legal review of the policy.
- A `production` build cannot be created with a wrong API URL, but nothing checks that the URL is reachable: the
  end-to-end test of the bearer flow through the web proxy (`e2e/mobile-bearer-proxy.spec.ts`) covers the path.
- `sharp` is an explicit dev dependency of the mobile app (used by the asset script and its test).
