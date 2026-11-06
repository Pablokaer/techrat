# ADR-0047: Android releases from a tag, as Play draft releases

**Status:** Accepted · Revises "Automating later" in ADR-0024 (EAS Build and versioning)

## Context

ADR-0024 kept `eas build` and `eas submit` manual until the app existed on Google Play. The app is now ready for its
first upload (versionCode 4 built and checked on 2026-11-05), and every later release would repeat the same steps by
hand: build on EAS, download the `.aab`, upload it to the Play Console. Doing that from a laptop also skips the checks CI
runs and leaves no record of which commit was released.

A release cannot be undone on Play (a versionCode is used up once uploaded), and it ships to users without passing
through the web deploy, so it must not start just because CI is green.

## Decision

- **`.github/workflows/android-release.yml` releases the Android app.** It starts when a tag `android-v<version>` is
  pushed, or by hand from the Actions tab, and never on a branch push or a pull request.
- **It releases only what production already runs:** the commit must be on `main`, and the tag must equal
  `expo.version` in `apps/mobile/app.json`. It runs the mobile typecheck, tests and production-config check again first.
- **A person approves it twice.** The build-and-submit job uses the `google-play` environment, which requires the
  owner's approval and accepts only `android-v*` tags and `main`. The submission is a **draft** release
  (`releaseStatus: "draft"` in `eas.json`), so it still has to be rolled out in the Play Console.
- **Two submit profiles:** `production` goes to the internal testing track; `closed` goes to closed testing (`alpha`).
  Production is reached by promoting a tested release in the Play Console, never by a fresh build.
- **No Google secret in GitHub or in the repository.** The Play service-account key is uploaded to the Expo account
  (`eas credentials`) and used by EAS when it submits; GitHub holds only `EXPO_TOKEN`, as an environment secret.
- **The first upload stays manual**: Play only learns the package name and signing from a Console upload.

## Consequences

- A release is `git tag android-v1.0.1 <commit on main> && git push origin android-v1.0.1`, an approval, then
  "Review release" in the Play Console. `versionCode` keeps coming from EAS remote versioning.
- The owner has to create the service account in Google Cloud, invite it in Play Console with release permissions,
  upload its key to EAS and set `EXPO_TOKEN` (steps in `docs/android-release.md`). Until then the release job fails at
  the Expo login and nothing is uploaded.
- Each run uses an EAS build from the account's quota.
- `apps/mobile/src/app-config.test.ts` pins the triggers, the checks, the environment and the draft status.
