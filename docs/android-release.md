# Releasing the Android app (Google Play)

How to take `apps/mobile` from this repository to Google Play with **EAS Build**. The code is ready for the first
production build; the steps below are the ones that need a person (accounts, signing keys, store listing). Design
choices are in [ADR-0024](adr/0024-eas-build-and-versioning.md); account deletion is in
[ADR-0023](adr/0023-account-deletion.md).

> The first upload is manual. Later releases are built and submitted by the Android release workflow when an
> `android-v<version>` tag is pushed and the owner approves it (section 8, ADR-0047); a normal merge never releases.

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
in `app.json` (`android.blockedPermissions`), and so are `USE_BIOMETRIC` and `USE_FINGERPRINT`, which `expo-secure-store`
adds for keys kept behind a fingerprint: the app never stores its tokens that way. To see what a build would ask for, run
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
   app, its package name and its signing from a manual first upload; later releases go through the Android release
   workflow (section 8).
3. **Store listing:** title, short and full description in English and Portuguese are ready in `apps/mobile/store/listing/{en-US,pt-BR}.json` (a test keeps them inside the Play limits: 30 / 80 / 4000 characters; add pt-BR as a translation of the listing in the console), the icon `apps/mobile/store/play-store-icon-512.png` (512x512),
   the feature graphic `apps/mobile/store/feature-graphic-1024x500.png` (a **placeholder**: replace it with real
   artwork if you want) and the phone screenshots in `apps/mobile/store/screenshots/` (six, 1200x2400: taken on an Android emulator from the
   first preview build, signed in as the review account, then padded with the app's black background because Play
   rejects a long side more than twice the short one; a test checks the count and sizes). Retake them when a screen
   changes.
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

Both legal pages are **drafts that need legal review** (a banner says so; no `TODO` marker is left: the operator, contact email, Irish law, minimum age 16, Hostinger in the
United Kingdom (EU adequacy decision until 27 December 2031), Resend in Ireland, backup and log periods are filled in, see [ADR-0033](adr/0033-backups-log-retention-and-irish-legal-basis.md)). Do not submit to production before a review.

## 8. Later releases: the Android release workflow

After the first manual upload, releases go through `.github/workflows/android-release.yml` ([ADR-0047](adr/0047-android-release-workflow.md)).
It builds on EAS and sends the bundle to Play as a **draft** release; nothing reaches testers until you roll it out.

### One-time setup

1. **Google Cloud:** in a Google Cloud project, enable the *Google Play Android Developer API*, create a service account
   and download a JSON key for it. Keep the file out of the repository.
2. **Play Console → Users and permissions → Invite new users:** invite the service account's email, give it access to
   TechRat with *Release apps to testing tracks* (add *Release to production* only if you want that later) and send.
3. **Upload the key to EAS:** `cd apps/mobile && eas credentials -p android`, then *Google Service Account → Upload a
   Google Service Account Key* and pick the JSON file. Delete the local copy afterwards; EAS uses its copy to submit.
4. **Expo token:** expo.dev → Account settings → Access tokens → *Create token*. Store it as an environment secret:
   `gh secret set EXPO_TOKEN --env google-play` (paste the token when asked).
5. The **`google-play` environment** already exists in the repository settings: it requires the owner's approval and
   accepts only `android-v*` tags and `main`.

### Releasing a version

1. Raise `expo.version` in `apps/mobile/app.json` (for example `1.0.1`) in a normal PR and let it reach `main`.
2. Tag that commit on main and push the tag:
   ```bash
   git fetch && git tag android-v1.0.1 origin/main && git push origin android-v1.0.1
   ```
   (Or run *Android release* from the Actions tab on `main`, choosing the `internal` or `closed` track.)
3. The **verify** job checks that the commit is on `main` and the tag matches `expo.version`, then runs the mobile
   typecheck, tests and production-config check.
4. Approve the **release** job (*Review deployments* on the run page). It starts the EAS build of the `.aab`
   (`versionCode` goes up by itself) with auto-submit, and its summary links to the build on expo.dev. The runner does
   not wait: the build (15–25 minutes plus the EAS queue) and the submission with the `production` submit profile
   (internal testing) or `closed` (closed testing, the `alpha` track) run on EAS, which emails the account if either
   fails.
5. In the Play Console, open the track, check the draft release and press **Review release → Start rollout**. Promote
   it to production from there when it is ready (*Promote release*), without building again.

If Play rejects the submission, the EAS submission page linked from the run explains why (a missing permission of the
service account is the usual cause).

## Troubleshooting

* **"EXPO_PUBLIC_API_URL ..." error when the app starts:** a release bundle was built without the variable or with an
  `http://` URL. Build through the `preview`/`production` profiles, which set it.
* **`npm ci` fails on EAS:** every npm workspace listed in the root `package.json` must be in the upload. Do not add
  `apps/web` or `apps/desktop` to `.easignore`.
* **`expo-doctor` complains about patch versions:** run `npx expo install --check` in `apps/mobile` and commit the
  lockfile.

## Owner checklist (what is left before the first upload)

Everything the repository can do for the release is done and verified (typecheck, lint, mobile tests, `expo-doctor`,
production config, Android bundle export, a production `.aab` with only the expected permissions). What remains needs you:

- [ ] Have the policy and terms reviewed, then set `LEGAL.draft` to `false` and deploy, so `/privacy`, `/terms` and
      `/account/delete` are final before Play reviews the app (they are live already).
- [x] Confirm `https://techrat.io` serves the API (register, login, refresh) and sends email.
- [x] Create the Expo account, then `eas login` and `eas init` (commit the `projectId`).
- [x] Generate the upload keystore (done by the first `eas build`; kept in the Expo account).
- [ ] Install the app on a real phone (from internal testing) and walk through register, practice, profile photo, change
      password and delete account (it was checked on the emulator).
- [x] Create the Play Developer account (a personal one needs the 12 testers / 14 days closed test: start it early).
- [x] Register the review account in production (a normal learner with a confirmed email). Its email and password
      go into the Play Console form only, never into the repository.
- [x] Take the phone screenshots (`apps/mobile/store/screenshots/`). Optionally replace the placeholder feature
      graphic.
- [x] `eas build --platform android --profile production` (versionCode 4, 2026-11-05).
- [ ] Upload that `.aab` by hand to Internal testing and fill the store listing and the App content forms (section 5).
- [ ] Set up the Android release workflow for the next releases (section 8: service account, key in EAS, `EXPO_TOKEN`).
