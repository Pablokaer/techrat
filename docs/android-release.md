# Releasing the Android app (Google Play)

How to take `apps/mobile` from this repository to Google Play with **EAS Build**. The code is ready for the first
production build; the steps below are the ones that need a person (accounts, signing keys, store listing). Design
choices are in [ADR-0024](adr/0024-eas-build-and-versioning.md); account deletion is in
[ADR-0023](adr/0023-account-deletion.md).

> Nothing in CI builds or submits to the stores. `eas build` and `eas submit` are run by hand, as described here.

## Prerequisites

| What | Notes |
|---|---|
| Expo account | Free. Owns the project, the Android keystore and the build history. |
| `eas-cli` | `npm install -g eas-cli` (or prefix every command with `npx`). Version 16 or newer (`eas.json` requires it). |
| Google Play Developer account | One-time registration fee and identity verification. A **personal** account created after 13 Nov 2023 must run a closed test with at least **12 testers for 14 continuous days** before it can publish to production (see "Release tracks"). An organisation account does not have this rule. |
| Node 22 and the repo installed | `npm ci` at the repository root (npm workspaces). |

## 1. One-time setup

```bash
cd apps/mobile
eas login
eas init            # creates the EAS project; adds extra.eas.projectId (and owner) to app.json: commit that change
```

* The Android package name is **`io.techrat.app`** (also the iOS bundle identifier). It can never change after the
  first upload to Play. Check it in `app.json` before the first build.
* `EXPO_PUBLIC_API_URL=https://techrat.io` is set per profile in `eas.json`. The app holds no secrets; everything it
  embeds is public. A release build refuses to start without an `https://` API URL (`src/lib/config.ts`).

## 2. Check before you build

From the repository root:

```bash
npm ci
npm run typecheck && npm run lint && npm test           # all workspaces, mobile included
npm run check:production-config -w @techrat/mobile      # the production Expo config resolves and is store-ready
cd apps/mobile && npx expo-doctor                       # SDK-compatible dependencies, config plugins
cd apps/mobile && npx expo export --platform android --output-dir dist   # the Metro bundle builds
```

CI runs the typecheck, tests, `expo-doctor` and the production-config check on every pull request.

**Expected Android permissions** (the merged manifest of a release build): `INTERNET`, `VIBRATE` and `CAMERA` (taking a
profile photo). `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW` are blocked
in `app.json` (`android.blockedPermissions`). To see what a build would ask for, run
`npx expo prebuild --platform android --no-install` in a scratch copy and read
`android/app/src/main/AndroidManifest.xml` (do not commit the generated `android/` folder). Release builds block
cleartext HTTP; only development builds allow it, for LAN testing.

## 3. Build

```bash
cd apps/mobile

# Installable APK for testers (internal distribution link / QR code):
eas build --platform android --profile preview

# The Play Store bundle (.aab):
eas build --platform android --profile production
```

* **First build:** EAS asks to generate an Android keystore. Say yes: it is stored in your Expo account (back it up
  with `eas credentials`). This is the **upload key**; Google re-signs releases with the **app signing key** it keeps
  (Play App Signing, on by default for new apps), so a lost upload key can be reset with Google.
* The `development` profile builds a development client for day-to-day work on a device.
* The archive uploaded to EAS is the whole monorepo, filtered by `.easignore` (no backend, docs or e2e).

## 4. Versions

* **`version`** in `app.json` is what users see (`1.0.0`). Change it by hand for each release (`1.0.1`, `1.1.0`, ...).
* **`versionCode`** (the integer Play requires to increase) is owned by EAS (`appVersionSource: "remote"`). The
  `production` profile auto-increments it on every build. Inspect or correct it with `eas build:version:get -p android`
  and `eas build:version:set -p android`. Do not add `android.versionCode` to `app.json`.

## 5. Play Console: create the app

1. **Create app** (name TechRat, default language, App, Free). Accept Play App Signing.
2. **Upload the first `.aab` by hand** to *Testing → Internal testing → Create new release*. Play only learns about the
   app, its package name and its signing from a manual first upload; later releases can be automated with
   `eas submit` and a service-account key (see "Automating later").
3. **Store listing:** title, short and full description in English and Portuguese are ready in `apps/mobile/store/listing/{en-US,pt-BR}.json` (a test keeps them inside the Play limits: 30 / 80 / 4000 characters; add pt-BR as a translation of the listing in the console), the icon `apps/mobile/store/play-store-icon-512.png` (512x512),
   the feature graphic `apps/mobile/store/feature-graphic-1024x500.png` (a **placeholder**: replace it with real
   artwork if you want) and **at least two phone screenshots** (not in the repository: take them from a build).
   Regenerate icons and graphics with `npm run assets:android -w @techrat/mobile`.
4. **App content** (all required before review):
   * **Privacy policy:** `https://techrat.io/privacy`.
   * **App access:** the app needs an account, so give reviewers a **test account** under *Instructions for
     reviewers*: register a dedicated account in production (for example `play-review@...`, a normal learner, never an
     administrator), give its email and password in the form (the ready-made text is `reviewerInstructions` in the listing files: replace `{REVIEW_EMAIL}` and `{REVIEW_PASSWORD}`) and keep it working while reviews are open.
   * **Data safety:** copy the answers from [`docs/play-store/data-safety.md`](play-store/data-safety.md).
   * **Account deletion** (Data safety → "Data deletion"): in the app *Profile → Delete account*, and the web link
     `https://techrat.io/account/delete`, which works without the app.
   * **Ads:** none. **Target audience and content:** answer honestly (the app is a learning platform with no
     user-to-user chat); decide the minimum age together with the privacy policy.
   * **Content rating** questionnaire, **government apps**, **financial features**, **health**: all "no".

## 6. Release tracks

| Track | Purpose | Notes |
|---|---|---|
| Internal testing | Up to 100 testers, available in minutes, no review for updates | Use it for every build first. |
| Closed testing | Invite-only testers | **Personal developer accounts: 12 testers opted in for 14 continuous days** before *Apply for production*. Start this early; the clock only runs while 12 testers stay opted in. |
| Production | Everyone | Promote the **same release** that passed closed testing (*Promote release*), do not rebuild. |

## 7. Public URLs to enter in the console

| Field | URL |
|---|---|
| Privacy policy | `https://techrat.io/privacy` |
| Account deletion web link | `https://techrat.io/account/delete` |
| Terms (store listing, optional) | `https://techrat.io/terms` |

Both legal pages are **drafts that need legal review** (a banner says so; no `TODO` marker is left: the operator, contact email, Irish law, minimum age 16, Hostinger in
Manchester (UK, EU adequacy decision), Resend in Ireland, backup and log periods are filled in, see [ADR-0033](adr/0033-backups-log-retention-and-irish-legal-basis.md)). Do not submit to production before a review.

## Automating later (not enabled)

Builds and submissions stay manual for now. If you want CI to do it, create an Expo access token, store it as the
repository secret `EXPO_TOKEN`, and add a workflow run on a release tag that does:

```yaml
- uses: expo/expo-github-action@v8
  with: { eas-version: latest, token: "${{ secrets.EXPO_TOKEN }}" }
- run: npm ci
- run: eas build --platform android --profile production --non-interactive --wait
  working-directory: apps/mobile
- run: eas submit --platform android --profile production --latest --non-interactive   # needs a Play service-account key configured in eas.json
  working-directory: apps/mobile
```

Add an environment with required reviewers before enabling it: a release should not depend on a green merge alone.

## Troubleshooting

* **"EXPO_PUBLIC_API_URL ..." error when the app starts:** a release bundle was built without the variable or with an
  `http://` URL. Build through the `preview`/`production` profiles, which set it.
* **`npm ci` fails on EAS:** every npm workspace listed in the root `package.json` must be in the upload. Do not add
  `apps/web` or `apps/desktop` to `.easignore`.
* **`expo-doctor` complains about patch versions:** run `npx expo install --check` in `apps/mobile` and commit the
  lockfile.

## Owner checklist (what is left before the first upload)

Everything the repository can do for the release is done and verified (typecheck, lint, 110 mobile tests, `expo-doctor` 21/21,
production config, Android bundle export). What remains needs you:

- [ ] Have the policy and terms reviewed by a solicitor, then set `LEGAL.draft` to `false`. Deploy the web app so `/privacy`, `/terms` and `/account/delete` are live.
- [ ] Confirm `https://techrat.io` serves the API (register, login, refresh) and sends email.
- [ ] Create the Expo account, then `eas login` and `eas init` (commit the `projectId`).
- [ ] `eas build --platform android --profile preview`, install the APK on a real phone and walk through register, practice,
      profile photo, change password and delete account.
- [ ] Create the Play Developer account (a personal one needs the 12 testers / 14 days closed test: start it first).
- [ ] Register the review account in production and fill `reviewerInstructions`.
- [ ] Take at least two phone screenshots from the preview build; optionally replace the placeholder feature graphic.
- [ ] `eas build --platform android --profile production`, upload the `.aab` to Internal testing, fill the App content forms.
