# ADR-0023: Account deletion

**Status:** Accepted · Builds on ADR-0008 (authentication) and ADR-0018 (password changes sign out other sessions)

## Context

Google Play requires every app that lets people create an account to let them delete it, **inside the app and through
a web link that works without the app** (entered in the Play Console). The platform had no deletion at all. Deleting
an account is irreversible and the data is personal, so it needs re-authentication, no half-deleted states, immediate
effect on every session, and a clear answer to "what is deleted and what is kept".

## Options considered

1. **Soft delete** (flag the account, keep the rows). Easy to undo, but it keeps personal data and still has to hide
   the account everywhere, and Play expects the data to be deleted.
2. **Anonymise the profile and keep the learning history.** Keeps aggregate numbers, but attempts and XP are tied to
   one person's activity over time, so it is still personal data and it would leave an orphan identity.
3. **Hard delete everything tied to the account.** Simple to explain and verify.

We chose **3**.

## Decision

- **Endpoint:** `DELETE /api/v1/account` with a JSON body, authenticated, under the `auth` rate-limit policy. The body
  carries `password` for accounts that have one, or `confirmation` (the account's own username, case-insensitive) for
  accounts created through an external provider, which have no password to prove. A wrong password counts towards
  lockout exactly like a failed login (same rule as changing the password); a locked account cannot delete itself.
  Answers: 204, 400 with field errors (`password`, `confirmation`), 409 for the last administrator, 429, 401.
- **Deleted:** the Identity user (credentials, roles, claims, external logins, tokens) and, through the database
  cascades that already exist, the learner profile (display name, email, bio, username), the profile photo, practice
  sessions, question attempts, daily-challenge completions, topic progress, XP transactions, achievements,
  notifications and roadmap/module progress. It is a single `DELETE` of the Identity row, so it either happens
  completely or not at all.
- **Kept:** nothing about the person. Not personal and therefore kept: the questions, topics, roadmaps and other
  catalog content. Pending outbox messages hold only the user's id (a random GUID that no longer points at anything);
  the handler skips them. Application logs keep the same GUID for the standard log retention (no name, email or other
  data); the log line for the deletion is `Account deleted {UserId}`.
- **Leaderboards:** pages are cached for 30 s. The service now keeps only rows whose profile still exists and takes
  part, so a deleted learner disappears from every cached page at once (the same filter already handled opt-outs).
- **Tokens stop working at once.** Refresh tokens are validated against the user's security stamp, so they die with
  the user. Access tokens are stateless and would live up to 30 minutes, so `AccountExistsMiddleware` treats a request
  whose account no longer exists as signed out. The answer is cached for 2 minutes per user (one lookup per user, not
  per request) and the cache entry is evicted when the account is deleted, which is immediate for every instance that
  shares Redis; with the in-memory cache fallback (no Redis, a single instance) it is immediate too.
- **Web cookie sessions** are signed out in the response (the cookie is cleared) and the middleware rejects the old
  cookie on the next request even before the 5-minute security-stamp check would.
- **Administrators:** the last account in the `Admin` role cannot delete itself (409), so the admin area can never be
  locked out. Any other administrator can.
- **Notice:** the former owner receives an email (English or Portuguese, from the request language) confirming the
  deletion, sent after it and to the address captured before it. A delivery failure is logged without the address and
  does not undo the deletion.
- **Clients:** the web has a "Delete account" section in Settings and a public `/account/delete` page (the URL for
  the Play Console form); the mobile app has a Delete account screen on Profile. Both ask for the password, or the
  username, and warn that it cannot be undone. `BearerSession.deleteAccount` clears the stored tokens.

## Consequences

- Deleting is irreversible: there is no grace period or undo. The confirmation text says so.
- Backups made before the deletion may still contain the data until they expire; the privacy policy states that.
- A new table with a `UserId` must cascade from the user (or `DeleteAccountTests.RowsOfAsync` must learn about it): the
  integration test lists every table that can hold a row of the account and requires all to be empty afterwards.
- The middleware adds one cache read to every authenticated request.
