# ADR-0037: One module owns re-authentication and ending sessions

**Status:** Accepted · Builds on ADR-0007 (the backend owns every business rule), ADR-0018 (password changes sign out
other sessions), ADR-0023 (account deletion), ADR-0029 (login hardening) and ADR-0030 (single-use refresh tokens)

## Context

`IdentityEndpoints` held security rules that ADR-0007 puts in Application:

- **Re-authentication was copied.** Changing the password and deleting the account each had their own "is the account
  locked, is the password right, count the failed attempt" sequence, their own error helper and their own handling of a
  passwordless account (external sign-in). A fix to one could silently miss the other.
- **Security notices were copied.** Each endpoint had its own "send the email, swallow `EmailDeliveryException`, log
  the user id" block.
- **Ending sessions had no owner.** It was spread over four mechanisms used in different combinations: the security
  stamp (sign-out, password change), the per-sign-in refresh state of `RefreshSessions` (ADR-0030), the cached
  "account exists" answer read by `AccountExistsMiddleware` (deletion) and the web cookie (sign-out, deletion).
  Nothing said "this is what ending a session means".

## Decision

`IAccountSessions` (`TechRat.Application/Identity/AccountSessions.cs`) is the single module for these rules; the
endpoints only translate its answers to HTTP.

- **`ReauthenticateAsync(user, proof, withoutPassword)`** returns an outcome (`Verified`, `PasswordRequired`,
  `LockedOut`, `PasswordIncorrect`, `UsernameMismatch`), whether the account has a password, and the message key, so the
  same refusal reads the same everywhere. The rules are unchanged: a locked account is refused before the password is
  checked, a wrong password counts towards lockout like a failed login, a missing password is not counted as a guess.
  An account without a password either has nothing to prove (setting its first password) or types its own username
  (deletion, case-insensitive, trimmed). The endpoint only chooses the field name (`currentPassword`, `password`,
  `confirmation`).
- **`EndThisSessionAsync(userId)`** (sign-out): clears the cookie and rotates the security stamp, as before. Because
  refresh tokens are validated against the stamp, this also ends the refresh tokens of the account's other devices;
  that is today's behaviour and is kept.
- **`EndOtherSessionsAsync(user)`** (after a password change): rotates the stamp, forgets failed attempts, logs and
  sends the "password changed" notice. The calling session is renewed by the endpoint (new bearer tokens or a renewed
  cookie), because that is the shape of the HTTP answer. Identity's `ChangePasswordAsync`/`AddPasswordAsync` already
  rotate the stamp; the module rotates it again so the method keeps its promise whoever calls it (one extra write,
  no visible difference).
- **`EndEverySessionAsync(deletedUserId, formerAddress)`** (after deletion): evicts the "account exists" cache entry,
  clears the cookie, logs and sends the deletion notice to the address captured before the deletion.
- The cookie lives in the HTTP host, so the module reaches it through a port, `ISessionCookie`, implemented in
  `TechRat.Modules` with Identity's `SignInManager`. Application keeps no reference to ASP.NET Core.
- Security notices never fail the operation they report: a delivery failure is logged with the user id only.

## What was checked and left alone

- Sign-out does not revoke the `RefreshSessions` entry of the session it ends. That is not a bug today: rotating the
  stamp already makes every refresh token of the account fail `ValidateSecurityStampAsync` before rotation is even
  consulted. Revoking the entry as well would only matter if sign-out ever stopped rotating the stamp.
- The OpenAPI document is unchanged; no endpoint, status code or body changed.
- Password reset (anonymous, by emailed link) keeps its own flow and notice for now; it ends no session the caller holds.

## Consequences

- A new sensitive action that needs "prove it is you" calls `ReauthenticateAsync` and inherits the lockout rules.
- The rules are unit-tested through the interface (`Unit/AccountSessionsTests.cs`) with the real `UserManager` over an
  in-memory store, so lockout and stamp rotation are Identity's own; the API tests keep covering the HTTP behaviour.
