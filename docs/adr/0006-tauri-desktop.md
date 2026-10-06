# ADR-0006: Tauri for desktop

**Status:** Accepted

The desktop app is Tauri 2 wrapping the web app's static export (`BUILD_TARGET=desktop`). Compared with Electron it ships a ~5 MB installer, uses the OS webview and has a deny-by-default capability model (only `core:default` and `opener:default` are enabled; CSP restricts `connect-src` to the API).

Auth in the desktop build uses bearer tokens (`NEXT_PUBLIC_AUTH_MODE=bearer`). **Token storage:** the webview's app-private `localStorage`. Accepted for the MVP because the origin is private to the app and a strict CSP limits XSS; the planned upgrade is a keychain-backed store (e.g. `tauri-plugin-stronghold` or an OS keyring command) behind the same `TokenStorage` interface.
