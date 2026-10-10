# ADR-0006: Tauri for desktop

**Status:** Accepted

The desktop app is Tauri 2 wrapping the web app's static export (`BUILD_TARGET=desktop`). Compared with Electron it ships a ~5 MB installer, uses the OS webview and has a deny-by-default capability model (only `core:default` and `opener:default` are enabled; CSP restricts `connect-src` to the API).

Auth in the desktop build uses bearer tokens (`NEXT_PUBLIC_AUTH_MODE=bearer`). **Token storage:** the webview's app-private `localStorage` at first (accepted for the MVP: the origin is private to the app and a strict CSP limits XSS); now the OS credential store behind the same `TokenStorage` interface, see [ADR-0032](0032-desktop-tokens-in-the-os-keychain.md).
