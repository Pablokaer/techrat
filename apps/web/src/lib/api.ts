"use client";

import { createApiClient, unwrap, type TechRatClient } from "@techrat/api";
import { BearerSession, type TokenStorage } from "@techrat/auth";
import { localizedFetch } from "@/i18n/runtime";
import { createDesktopTokenStorage, tauriInvoke } from "./desktop-token-storage";

/**
 * Web: cookie mode against the same origin (Next rewrites /api → backend). Tokens never reach JavaScript.
 * Desktop (Tauri static export): bearer mode against NEXT_PUBLIC_API_URL.
 */
export const AUTH_MODE: "cookie" | "bearer" = process.env.NEXT_PUBLIC_AUTH_MODE === "bearer" ? "bearer" : "cookie";
export const API_BASE_URL = AUTH_MODE === "bearer"
  ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080")
  : typeof window !== "undefined" ? window.location.origin : "";

/**
 * Desktop token storage: the OS credential store through the Tauri shell (Windows Credential Manager, macOS Keychain, the
 * Secret Service on Linux), and `localStorage` only outside the shell (ADR-0032). When the keychain cannot be used the tokens
 * stay in memory and the person signs in again next time.
 */
function createTokenStorage(): TokenStorage {
  let local: Storage | null = null;
  try { local = window.localStorage; } catch { /* storage unavailable */ }
  return createDesktopTokenStorage({
    invoke: tauriInvoke(),
    local,
    onKeychainUnavailable: (error) => console.warn("The operating system keychain is not available; you will sign in again each time the app starts.", error),
  });
}

export const bearerSession: BearerSession | null =
  AUTH_MODE === "bearer" && typeof window !== "undefined" ? new BearerSession(API_BASE_URL, createTokenStorage(), localizedFetch) : null;

export const api: TechRatClient =
  bearerSession?.api ?? createApiClient({ baseUrl: API_BASE_URL, auth: { kind: "cookie" }, fetch: localizedFetch });

export { unwrap };

export async function login(email: string, password: string) {
  if (bearerSession) return bearerSession.login(email, password);
  await unwrap(api.POST("/api/v1/auth/login", { params: { query: { useCookies: true } }, body: { email, password } }));
  return unwrap(api.GET("/api/v1/users/me"));
}

export async function logout() {
  if (bearerSession) return bearerSession.logout();
  await api.POST("/api/v1/auth/logout");
}

/**
 * Changes (or sets, with no current password) the password. The API signs every other session out and keeps this one:
 * a renewed cookie on the web, new tokens on the desktop (stored by the bearer session).
 */
export async function changePassword(currentPassword: string | null, newPassword: string) {
  if (bearerSession) return bearerSession.changePassword(currentPassword, newPassword);
  await unwrap(api.POST("/api/v1/auth/change-password", { body: { currentPassword, newPassword } }));
}

/**
 * Permanently deletes the signed-in account. Accounts with a password send it; accounts without one (external
 * sign-in) send their username as `confirmation`. The server clears the session cookie on success; on the desktop the
 * bearer session drops its stored tokens. Failures throw an ApiError (400 field errors, 409 last admin, 429).
 */
export async function deleteAccount(password: string | null, confirmation: string | null) {
  if (bearerSession) return bearerSession.deleteAccount(password, confirmation);
  await unwrap(api.DELETE("/api/v1/account", { body: { password, confirmation } }));
}

export function hubUrl() {
  return `${API_BASE_URL}/hubs/notifications`;
}
