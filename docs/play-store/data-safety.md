# Play Console: Data safety answer sheet (TechRat Android app)

Ready to copy into **Play Console, App content, Data safety**. Every answer is derived from the code in this repository
(evidence in the "Proof" columns). The Android app (`apps/mobile`, package `io.techrat.app`) talks to one backend only:
the TechRat API at `https://techrat.io` (`apps/mobile/eas.json`, `EXPO_PUBLIC_API_URL`).

> Status: prepared from the code on branch `feat/android-release-prep`. The privacy policy it points to is still a
> draft pending legal review (see the checklist at the end). Re-check every answer whenever a feature, SDK or permission
> is added.

## 1. Top-level questions

| Play Console question | Answer | Why / proof |
| --- | --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** | Account, profile and learning data are sent to the API (section 2). |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Production builds use `https://techrat.io` only (`apps/mobile/eas.json`, `apps/mobile/src/lib/config.ts`); TLS is terminated by Apache with a Let's Encrypt certificate (`docs/deploy.md`, `deploy/apache/techrat.conf`); the API sends HSTS outside Development (`backend/TechRat.Api/Program.cs`, `UseHsts`). |
| Do you provide a way for users to request that their data is deleted? | **Yes** | In-app (Profile, Delete account) and on the web (below). Backend: `DELETE /api/v1/account`, ADR-0023. |
| Account creation methods | **Username/email + password** (no OAuth: the provider list exists but no external sign-in is wired, `IdentityEndpoints.cs`) | |
| Does the app follow the Families Policy / is it directed to children? | **No** (target audience: adults and teens learning software engineering; the minimum age is an owner decision, see the checklist) | No age gate exists in the code. |

## 2. Data types

"Shared" below follows Google's definition: transferring data to a third party. Service providers that process data only
on TechRat's behalf (hosting, email delivery) are **not** "sharing" under that definition, so every row says
**Shared: No**. They are named explicitly so the policy and this form stay consistent. No data is sold, and none goes to
advertisers or analytics providers.

"Processed ephemerally" means the data is only held in memory and never stored. None of the types below is ephemeral
(they are all stored in PostgreSQL), so every row says **No**.

### Collected

| Category / data type | What exactly | Collected | Shared | Required or optional | Purposes to tick | Ephemeral | Proof in the code |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Personal info / **Name** | Display name (how the user refers to themselves). It defaults to the username when left blank. | Yes | No | **Optional** | App functionality, Account management | No | Register screen and `RegisterRequest` (`displayName` nullable); shown on leaderboards and profiles (`LeaderboardService.cs`, `ProfileService.cs`). |
| Personal info / **Email address** | Sign-in identifier; target of password-reset, password-changed and account-deleted emails. | Yes | No (email provider is a processor) | **Required** | App functionality, Account management | No | `IdentityEndpoints.cs` register/login; `EmailSenders.cs`, `Localization.cs` templates. Never shown to other learners (blanked in profile responses). |
| Personal info / **User IDs** | Username (public handle shown on leaderboards and profiles) and the internal account GUID. | Yes | No | **Required** | App functionality, Account management | No | `UserEntities.cs`; leaderboard DTOs expose `username`/`userId`. |
| Photos and videos / **Photos** | Optional profile photo, cropped and resized on the device (512x512 JPEG) before upload. | Yes | No | **Optional** | App functionality | No | `apps/mobile/src/lib/avatar.ts`; `PUT /users/me/avatar`; stored in `learning.user_avatars` (`AvatarService.cs`). Camera and photo picker are used only for this (`expo-image-picker`, `app.json`). |
| App activity / **App interactions** | Answers and attempts (chosen option, correct or not, time spent), practice sessions, daily challenge, XP, levels, streaks, achievements, topic/roadmap/module progress, in-app notifications. | Yes | No | **Required** to use practice (the core feature) | App functionality | No | `Configurations.cs` tables `question_attempts`, `practice_sessions`, `xp_transactions`, `user_achievements`, `user_*_progress`, `notifications`. |
| App activity / **Other user-generated content** | Optional bio (free text, max 280 characters). | Yes | No | **Optional** | App functionality | No | `UserEntities.cs` (`Bio`), `PATCH /users/me`. |

### Not collected (and why)

| Category / data type | Answer | Proof |
| --- | --- | --- |
| Location (approximate or precise) | **No** | No location package or permission (`app.json`, `apps/mobile/package.json`). |
| Personal info: address, phone number, race and ethnicity, political or religious beliefs, sexual orientation, other info | **No** | Not in any entity or request. The Identity phone and 2FA columns exist in the table but are never set or offered. |
| Financial info (payments, purchase history, credit info) | **No** | No payments or purchases. |
| Health and fitness | **No** | |
| Messages (emails, SMS, other in-app messages) | **No** | There is no chat or messaging. The service emails TechRat sends are not user content. |
| Photos and videos / Videos | **No** | |
| Audio files, voice or sound recordings, music files | **No** | `RECORD_AUDIO` is in `blockedPermissions` (`app.json`). |
| Files and docs | **No** | |
| Calendar, Contacts | **No** | No such packages or permissions. |
| App activity / In-app search history | **No** (verify, see checklist) | Search queries go to `GET /search` to return results and are not stored in any table; the request log omits the query string (`ApiInfrastructure.cs`). |
| App activity / Installed apps, other actions | **No** | |
| Web browsing | **No** | `expo-web-browser` only opens documentation links the user taps; the app does not read browsing history. |
| App info and performance / Crash logs | **No** | No crash reporter (Sentry, Crashlytics, etc.) in `apps/mobile/package.json` or `app.json`. |
| App info and performance / Diagnostics | **No** (verify, see checklist) | No client-side diagnostics SDK. Server-side, OpenTelemetry exports only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`Telemetry.cs`); request logs hold method, route, status, duration, trace id and the internal user GUID, not content. |
| App info and performance / Other app performance data | **No** | |
| Device or other IDs | **No** | No advertising ID, Android ID, install ID, FCM or Expo push token: `expo-notifications` and push registration are not installed or called (searched `apps/mobile`). |

## 3. Data usage and handling questions (per collected type)

- **Is this data collected, shared, or both?** Collected only.
- **Is this data processed ephemerally?** No.
- **Is data collection required or optional?** As in the table (Name, Photos and bio are optional; email, user IDs and
  app interactions are required).
- **Why is this user data collected?** Tick **App functionality** and **Account management** for the personal-info rows;
  **App functionality** for photos, app interactions and user-generated content.
  Do **not** tick Analytics, Developer communications, Advertising or marketing, Fraud prevention/security/compliance,
  or Personalization. (Practice difficulty adapts to the user's accuracy; this is part of the core feature, so it is
  covered by App functionality. If you consider it "Personalization", tick it for App interactions.)

## 4. Security practices section

| Question | Answer |
| --- | --- |
| Data is encrypted in transit | **Yes**, HTTPS/TLS to `https://techrat.io`. |
| You can request that data be deleted | **Yes** |

Passwords are stored only as salted hashes (ASP.NET Core Identity) and Android tokens live in Keystore-backed secure
storage (`expo-secure-store`); neither has its own checkbox.

## 5. Account deletion (Play Console, App content, Data deletion / "Delete account" form)

- **In the app:** Profile, then **Delete account** (asks for the password, or the username for accounts without a
  password).
- **Web URL (works without the app and while signed out):** `https://techrat.io/account/delete`
- What is deleted: credentials, profile (name, email, username, bio), photo, progress, answers, XP, achievements,
  notifications and all sessions, immediately and irreversibly (ADR-0023).
- Data kept: none about the person. Backups made before the deletion may keep a copy until they expire, and server logs
  may keep the random internal account id; the page says so (the periods are still `TODO(legal)`).

## 6. Privacy policy

- **URL:** `https://techrat.io/privacy` (en and pt-BR, public, no login). Also reachable from the app's registration
  screen consent line.

## 7. Things the owner must double-check before submitting

1. **The policy is a draft.** `/privacy`, `/terms` and `/account/delete` carry a "draft pending legal review" banner and
   visible `TODO(legal)` / `TODO(owner)` markers. Resolve them, then set `LEGAL.draft = false` in
   `apps/web/src/lib/legal.ts`. Google rejects policies that are placeholders.
2. **Company name and contact email** (`LEGAL` in `apps/web/src/lib/legal.ts`): currently `TechRat` and
   `privacy@techrat.io`. Make sure the mailbox exists. The Play listing's developer email should match.
3. **Hosting provider and country, email provider, backup and log retention** are not stated anywhere in the repo
   (`docs/deploy.md` only suggests a manual daily `pg_dump`). Fill the TODOs with real facts.
4. **Which email provider runs in production?** The deployment examples use Resend (`.env.production.example`); confirm
   and name it in the policy.
5. **IP addresses.** Any HTTPS request reveals the client IP to the server. It is kept in Apache access logs
   (`deploy/apache/techrat.conf`, combined format) and used as an in-memory rate-limit key. Play does not list "IP
   address" as its own data type; if you want to be conservative, read Google's Data safety FAQ and decide whether this
   needs a declaration under Diagnostics or Device or other IDs. This sheet answers No because nothing in the app or
   backend uses it to identify or profile a user.
6. **Apache access logs hold query strings.** The password-reset link carries the email and reset code, and
   `/profile?u=<username>` carries a username, so both land in the access log. Consider logging without query strings.
7. **Leaderboard opt-out does not hide the profile page.** Signed-in users can still open `/users/{username}/profile`
   (`LearningEndpoints.cs`). The policy says so truthfully; decide whether the opt-out should also hide the profile.
8. **The profile photo URL is anonymous** (`GET /api/v1/users/{id}/avatar`, cached for a year). The policy discloses
   it.
9. **OpenTelemetry.** If production sets `OTEL_EXPORTER_OTLP_ENDPOINT`, traces go to that collector; then name it as a
   processor in the policy and reconsider the Diagnostics answer.
10. **Minimum age / Families policy.** There is no age gate. Decide the minimum age (the policy has a `TODO(owner)`), and
    answer the target-audience questions in Play Console to match (do not select "children").
11. **The delete-account promise for people who cannot sign in** ("write to the contact email") needs a real process
    behind it and a monitored mailbox.
12. **Android-side screens.** Confirm the app has the Profile, Delete account screen and the consent line with links to
    `/terms` and `/privacy` in the release build (`apps/mobile/src/app/delete-account.tsx`, `register.tsx`).
13. **Re-run this sheet** when adding push notifications, analytics, crash reporting, OAuth providers, in-app purchases
    or any new permission: each of those changes the answers above.
