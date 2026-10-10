# ADR-0032: Desktop tokens in the operating system keychain

**Status:** Accepted · Replaces the token-storage decision of ADR-0006; closes a known limit of ADR-0029

## Context

The desktop app (Tauri) signs in with bearer tokens and kept them in the webview's `localStorage` (ADR-0006, "accepted for the
MVP"). That storage is a file in the app-data folder that anything running in the page, and anyone with access to the
user's profile or a backup of it, can read. A copy of the refresh token worked for 14 days (ADR-0030 now notices a replay,
but a copy taken once and used first still wins until the owner refreshes). The Android app already uses SecureStore.

## Decision

- **The tokens live in the operating system's credential store** (Windows Credential Manager, macOS Keychain, the Secret
  Service on Linux) through three Rust commands in the shell: `secure_set`, `secure_get`, `secure_remove` (`keyring`
  crate). They sit behind the same `TokenStorage` interface the web client already used, so `BearerSession` did not change
  (`createDesktopTokenStorage`).
- **A session is split into pieces of 900 characters.** A Windows credential holds at most 2,560 bytes and stores the
  password as UTF-16, while a session (access and refresh token as JSON) is about 2 KB. The count is written last, so a
  reader never sees a count before its pieces; a missing piece reads as "no session" rather than half a token.
- **The commands only touch the app's own keys.** A key must start with `techrat.`, be short and use plain characters, so
  a script in the webview cannot use the commands to read or overwrite other programs' credentials.
- **Fail closed.** If the keychain cannot be used (Linux without a Secret Service, a locked store), the tokens stay in
  memory for the session and the person signs in again next time. They are never written back to `localStorage`.
- **Migration:** tokens an earlier version saved in `localStorage` are moved into the keychain on the first read and the
  copy is deleted; when the keychain is unusable that copy is deleted anyway, so it does not stay behind.
- Outside the shell (a browser in bearer mode, for development) `localStorage` is still used.

## Consequences

- On Linux the app needs a running Secret Service (GNOME Keyring, KWallet); without one the person signs in at each start.
- The Rust side is built only when the desktop installer is (CI builds the static export, not the Tauri binary). The
  `keyring` dependency is new, so `Cargo.lock` is updated by the first `cargo` run; run `cargo check` and `cargo test` in
  `apps/desktop/src-tauri` after pulling this change (the README says so).
- The TypeScript side is covered by unit tests with a fake keychain (round trip, pieces, stale pieces, corrupt state,
  migration, unavailable keychain); the Rust commands are small and their key rule has unit tests.

## Still open

There is no second factor (ADR-0029).
