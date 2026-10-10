# ADR-0029: Login security hardening

**Status:** Accepted · Builds on ADR-0008 (authentication) and ADR-0018 (password changes)

## Context

A review of sign-in, sign-up, password reset and the clients' sessions found what was already sound (PBKDF2 hashing,
lockout, HttpOnly + SameSite=Strict cookies, short access tokens, security-stamp validation, rate limits, uniform
"invalid credentials", no tokens in logs, no default credentials, CORS allow-list) and these gaps:

1. **Guessable passwords were accepted.** Length 8 plus upper/lower/digit accepts `Password1` and `Summer2024`.
2. **Account existence leaked through time.** An unknown email returned before any password was hashed; a known one
   returned after. Forgot-password sent the email before answering, so SMTP latency told known from unknown addresses.
3. **Guessing was cheap.** 8 attempts per 5 minutes is about 2,300 guesses a day per account from any number of addresses.
4. **Reset links lived for a day** (Identity's default) and the form could be used to flood an inbox.
5. **The key ring that signs login cookies and tokens was stored as plain XML in PostgreSQL.** A leaked backup or a SQL
   injection would let someone forge a session for any account, administrators included.
6. **Robustness:** reset-password with a missing field ended in a server error; there was no upper bound on password length.
7. **The web app sent no Content-Security-Policy or HSTS** (the API already does).

## Decision

- **Password rules** (`PasswordPolicyValidator`, on top of Identity's): refuse very common passwords even with digits or
  symbols appended or look-alike letters ("Summer2024!", "P@ssw0rd"); refuse a password that contains the username
  (3+ characters) or the part of the email before the `@` (4+); refuse more than 128 characters (`AuthPolicy`). The list is
  built in (English and Portuguese), so there is no network call. The web and mobile schemas mirror the length limit.
- **Uniform timing:** an unknown email still pays for one password verification (`AuthTiming`). Forgot-password does the
  same lookup and cooldown check for every address and sends the email after answering 202.
- **Lockout:** 8 attempts, then 15 minutes (about 770 guesses a day per account). The numbers live in `AuthPolicy`, and
  unit tests pin their relationships.
- **Reset links** expire after 1 hour, and at most one reset email per address per minute is sent (`ResetEmailThrottle`,
  keyed by a hash of the address so the cache never holds it; a cache outage never blocks a reset).
- **Key ring at rest:** when `DataProtection__CertificateBase64` (or `__CertificatePath`) and `__CertificatePassword`
  are set, the keys are encrypted with that certificate (`DataProtectionSetup`). A configured but unreadable
  certificate stops the start instead of running unprotected. Without one, production logs a warning at start. The production deploy creates the certificate in the server's `.env` on its first run (`deploy/new-dataprotection-cert.sh`), never replacing an existing one; a failure there does not block the deploy.
- **Inputs:** reset-password validates every field (400, same answer shape as a wrong code); sign-in turns away
  passwords over 1,024 characters without hashing them (generous, because older accounts may have longer ones).
- **Web headers:** a CSP (own origin only for scripts, API and real-time channel; no framing, plugins, foreign `<base>`
  or form targets) and HSTS, in production builds only. `'unsafe-inline'` stays for scripts and styles because Next.js
  hydrates with inline code; a per-request nonce would remove it but make every page dynamic.

## Consequences

- Some passwords that were valid are now refused at sign-up, change and reset. Existing passwords keep working until
  changed. The bootstrap admin password must pass the same rules (the seed logs a warning and creates nothing otherwise);
  `.env.example` no longer ships a weak example.
- The reset email can arrive a moment after the 202. If the process stops in that moment the email is lost and the user
  asks again (after the one-minute cooldown).
- Enabling the certificate encrypts new keys; keys already stored stay readable until Data Protection rotates them (up to
  90 days). Deleting the rows forces it and signs everyone out. The certificate must be the same on every instance and is
  never stored in the database. See [docs/deploy.md](../deploy.md).

## Known limits (not changed here)

- ~~**Sign-up still tells whether an email or username is taken.**~~ Closed for the email by [ADR-0031](0031-email-confirmation-at-sign-up.md)
  (usernames are public, so that one is still reported).
- ~~**Refresh tokens are stateless**~~ Closed by [ADR-0030](0030-refresh-token-rotation-and-uncacheable-auth-responses.md):
  refresh tokens are single use and a replay revokes the session.
- **The desktop app keeps its tokens in `localStorage`** (the Tauri webview), as ADR-0006 notes; the upgrade path is the OS
  keychain. The Android app already uses SecureStore.
- **Real-time connections** (SignalR over WebSockets) send the access token in the query string; it lives 30 minutes and
  is limited to `/hubs`, but proxy access logs should not record query strings.
- There is no second factor. Per-account (not only per-address) limits beyond lockout would need shared state.
