# ADR-0030: Single-use refresh tokens, uncacheable auth responses and small credential bodies

**Status:** Accepted · Builds on ADR-0008 (authentication) and ADR-0029 (login hardening), whose "known limits" listed the first point

## Context

A second pass over the login system, looking at what ADR-0029 left open and at what it had not looked at:

1. **Refresh tokens could be stolen without anybody noticing.** Identity's refresh tokens are stateless: the same token
   could be exchanged any number of times for 14 days, so a copy taken from a device (the desktop app keeps its tokens in
   `localStorage`) worked in parallel with the owner's, and neither side could tell.
2. **Nothing told caches to leave responses alone.** The API sent no `Cache-Control` at all, so the response that carries
   the access and refresh tokens, and the pages of a signed-in person's data, could be stored by a browser or a proxy
   under heuristic caching rules.
3. **A password reset left the account locked, and said nothing to the owner.** If the lockout came from someone else's
   guesses, following the emailed link still left the owner locked out for the rest of the lockout. And if the mailbox
   itself had been taken, nobody was told that the password had changed (changing it from Settings already sends a notice).
4. **Credential endpoints accepted bodies of any size** up to the server's 30 MB default.

## Decision

- **Single-use refresh tokens with reuse detection** (OAuth 2.0 Security BCP, "refresh token rotation").
  - Bearer sign-in creates a *session* (one per device). The session id and the id of the current refresh token travel
    as claims inside the tokens. The server keeps only those two random ids (plus the previous one and a revoked flag) per
    session, in the cache, with the refresh lifetime as TTL (`RefreshSessions`). It never stores a token.
  - Every refresh returns a new refresh token and makes the old one stale. Presenting a stale token means two parties
    hold the session: that session is **revoked** and both are answered 401, so the owner signs in again and the thief
    is out. The person's other devices keep working; a log line (`Warning`, user id only) records it.
  - **Grace window:** the previous token is still accepted for 30 seconds (`Auth:RefreshGraceSeconds`, 0 turns it off),
    so an app whose response was lost to a network drop can simply retry instead of signing the person out.
  - **Fail open on a lost cache.** If the cache lost a session (restart, eviction, no Redis) the token is accepted and
    tracking restarts from there; the same goes for tokens issued before this change (they carry no session ids), and
    for the tokens a password change returns. An outage therefore never signs anybody out; it only pauses detection.
  - Cookie sessions (web) are unchanged: the cookie is HttpOnly and never reaches JavaScript.
- **No caching of what is private** (`NoStoreMiddleware`): the auth and account endpoints always answer
  `Cache-Control: no-store` (and `Pragma: no-cache`), whatever an endpoint sets; anything else read by a signed-in person is
  `no-store` unless the endpoint chose its own policy. Public content for anonymous visitors is untouched.
- **Password reset** now clears the lockout (the link proves the owner controls the mailbox) and sends the "your password was
  changed" notice to the address on file, with its link to reset again; completing a reset is logged (`Information`, user id).
- **Small bodies for credentials** (`SmallBodyMiddleware`): `/api/v1/auth/*` and `/api/v1/account` take 8 KB at most
  (the largest legitimate request is about 1.5 KB). A declared oversized body is answered 413 at once and the server limit is
  lowered for bodies of unknown size. Other endpoints, avatar upload included, keep the server default.

## Consequences

- A refresh token is now good for one use. Clients already single-flight their refresh and store the token returned, so
  mobile and desktop need no change. A second device must not reuse another device's refresh token (nobody does: tokens are
  per sign-in).
- Detection needs the shared cache: with Redis (production) it works across instances; with only the in-memory cache each
  instance has its own view, so reuse is detected when the replay reaches the instance that issued the token.
- Access tokens already issued live out their 30 minutes after a revocation, as with every other sign-out (ADR-0018).
- The reset notice goes out even when the person asked for it themselves; the cost is one extra email per reset.

## Still open

Sign-up reveals whether an email or username is taken (needs email verification), the desktop app keeps tokens in
`localStorage` (ADR-0006: move to the OS keychain), there is no second factor, and the SignalR access token travels in the
query string of the WebSocket URL (30 minutes, `/hubs` only).
