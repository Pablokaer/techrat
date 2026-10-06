# ADR-0018: Changing the password signs every other session out

**Status:** Accepted · Builds on ADR-0008 (authentication)

## Context

Learners need to change their password from Settings (web, desktop, mobile). A password change is also the usual
reaction to a suspected compromise, so the change must cut off whoever else holds a session, without making the
learner sign in again on the device they are using. Sessions are cookies on the web and bearer + refresh tokens on
desktop and mobile (ADR-0008).

## Decision

- `POST /api/v1/auth/change-password` (`{ currentPassword, newPassword }`) checks the current password **on the server**.
  Wrong guesses count towards the Identity lockout (8 attempts, 5 minutes), like logins, and the endpoint shares the
  `auth` rate limit. The new password goes through the same Identity password validators as sign-up and must differ
  from the current one. Passwords are never logged or returned.
- `UserManager.ChangePasswordAsync` rotates the **security stamp**. Every refresh token issued before stops working, and
  other cookies fail their next stamp validation (every 5 minutes). Access tokens already issued live out their
  30-minute lifetime.
- The calling session continues: a cookie session gets a renewed cookie (`RefreshSignInAsync`, 204), and a bearer
  session gets new tokens (200, `AccessTokenResponse`), which `BearerSession.changePassword` stores.
- Accounts without a password (future external sign-in: GitHub, Google...) set one through the same endpoint without
  `currentPassword`. `GET /api/v1/auth/password` tells clients whether to show "Change password" or "Set a password".
- The owner gets a "your password was changed" email (`IAccountEmailSender`) with a link to reset it. An email failure
  is logged and does not undo the change.

## Consequences

- Another device can keep working for up to 30 minutes (bearer) or 5 minutes (cookie) after the change. Shorter
  windows would need server-side token revocation lists.
- External sign-in is not wired yet, so today every account has a password; the "set a password" path is ready for it.
