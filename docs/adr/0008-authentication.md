# ADR-0008: Authentication with ASP.NET Core Identity

**Status:** Accepted

- ASP.NET Core Identity (`AddIdentityApiEndpoints`) — platform password hashing (PBKDF2 with per-user salt), lockout, security stamps, reset tokens.
- Two schemes on the same endpoints: **cookie** for the web (HttpOnly, SameSite=Strict, Secure outside development) and **bearer + refresh tokens** for mobile/desktop (30 min access, 14 day refresh). Data Protection keys are persisted in PostgreSQL so tokens survive restarts and work across instances.
- Logout rotates the security stamp (invalidates refresh tokens). Refresh tokens are single use and a replayed one revokes its session (ADR-0030).
- Password reset never reveals whether an account exists and emails a link (Mailpit locally); tokens are never logged.
- Auth endpoints are rate limited per IP.
- OAuth (GitHub featured, Google, Microsoft, Apple) is prepared: `/api/v1/auth/providers` advertises them and the UI shows "coming soon" until a `ClientId` is configured. Adding a provider means registering the external scheme and an external-login callback that links to `ApplicationUser`.
