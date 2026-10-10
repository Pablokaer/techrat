# ADR-0031: Email confirmation at sign-up, with the same answer for every address

**Status:** Accepted · Builds on ADR-0008 (authentication) and ADR-0029 (login hardening), whose "known limits" listed sign-up enumeration

## Context

Sign-up answered `400 "email already registered"` for an address that had an account. Anyone could therefore ask the
form which emails are registered (rate limiting only slows that down), and an account could be created with somebody
else's address without that person ever being asked. Fixing the first needs the sign-up to answer the same for every
address, which in turn needs the account to be proven by the mailbox before it can be used.

## Decision

- **`POST /auth/register` answers `202 {"confirmationRequired": true}` whatever the address.** The account is created with
  `EmailConfirmed = false` and cannot sign in. A new address gets a confirmation link (valid 24 hours, its own token
  lifetime: `EmailConfirmationTokenProvider`). An address that already has an account gets a notice instead ("someone
  tried to create an account with your email", with links to sign in and to reset the password) and nothing is created.
- **Same work, same time.** The rules that do not depend on the address (format, username, the password policy) run first
  and fail alike for everybody; an existing address still pays for one password hash; both emails are sent after the answer
  and at most one of each kind per address per minute (`ResetEmailThrottle`, with its own window per kind).
- **A taken username is still reported.** Usernames are public (profiles, leaderboards), so saying one is taken reveals
  nothing private.
- **Sign-in checks the password first, then the confirmation.** `403` means "right password, email not confirmed yet", so
  only whoever knows the password learns that (Identity's `RequireConfirmedEmail` would answer before the password check
  and reveal unconfirmed accounts to anybody). The web and mobile login screens offer to send the link again.
- **`POST /auth/confirm-email`** (`{email, code}`) answers 204, or one 400 shape for an unknown address and for a wrong,
  expired or used code (following the link rotates the security stamp, so it works once). **`POST /auth/resend-confirmation`**
  always answers 202 and sends only to an existing unconfirmed account.
- **A password reset also confirms the address** (the link went to that mailbox), so someone who lost the confirmation
  email can recover with "forgot password".
- **Existing accounts are grandfathered:** a migration marks every account that exists when this deploys as confirmed;
  otherwise everybody already using the platform would be locked out. The seeded administrator is confirmed.
- **Clients:** the web register page and the Android register screen no longer sign in; they say where the link went and
  offer to resend it. The emailed link opens the web page `/confirm-email`, which confirms once and removes the code from
  the address bar. Desktop uses the same web pages.

## Consequences

- A new person must open an email before the first session. Deliverability now matters for sign-up (SMTP must be configured;
  see `docs/email.md`); without SMTP the link is not sent and the account cannot be confirmed, except through a password reset.
- Someone who registers with a typo in the address never gets the link and the address stays free of an account that
  works; the half-created account can be left (it holds a unique username) or removed by an administrator.
- The 202 is the same for everybody, but the email each side receives differs, which is the point: only the mailbox owner sees it.
- Accounts created by people who never confirm are not cleaned up automatically (a candidate for a later job).

## Still open

The desktop app keeps its tokens in `localStorage` and there is no second factor (ADR-0029, ADR-0030).
