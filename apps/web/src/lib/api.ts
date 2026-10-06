"use client";

import { createApiClient, unwrap, type TechRatClient } from "@techrat/api";
import { BearerSession, type TokenStorage } from "@techrat/auth";
import { localizedFetch } from "@/i18n/runtime";

/**
 * Web: cookie mode against the same origin (Next rewrites /api → backend). Tokens never reach JavaScript.
 * Desktop (Tauri static export): bearer mode against NEXT_PUBLIC_API_URL.
 */
export const AUTH_MODE: "cookie" | "bearer" = process.env.NEXT_PUBLIC_AUTH_MODE === "bearer" ? "bearer" : "cookie";
export const API_BASE_URL = AUTH_MODE === "bearer"
  ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080")
  : typeof window !== "undefined" ? window.location.origin : "";

/** Desktop token storage. The Tauri webview is a single-user, app-private origin; see ADR-0006 for the upgrade path to the OS keychain. */
const localTokenStorage: TokenStorage = {
  async get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
  async set(k, v) { try { window.localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  async remove(k) { try { window.localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

export const bearerSession: BearerSession | null =
  AUTH_MODE === "bearer" && typeof window !== "undefined" ? new BearerSession(API_BASE_URL, localTokenStorage, localizedFetch) : null;

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

export function hubUrl() {
  return `${API_BASE_URL}/hubs/notifications`;
}
