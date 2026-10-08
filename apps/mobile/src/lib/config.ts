import { Platform } from "react-native";

/**
 * Resolves the API base URL.
 *
 * Development: EXPO_PUBLIC_API_URL wins; otherwise the Android emulator reaches the host machine through 10.0.2.2,
 * while the iOS simulator and web use localhost. Plain HTTP is fine on a LAN.
 *
 * Release: the URL is mandatory and must be HTTPS. A production build that silently fell back to the emulator alias
 * would ship an app that cannot sign anyone in, and one pointed at plain HTTP would send bearer and refresh tokens in
 * the clear. Failing at startup with a clear message is safer than either (Android also blocks cleartext traffic in
 * release builds, so the check keeps the failure explicit instead of a network error).
 */
export function resolveApiUrl(envUrl: string | undefined, os: string, dev: boolean = __DEV__): string {
  const fromEnv = envUrl?.trim();
  if (!dev) {
    if (!fromEnv) throw new Error("EXPO_PUBLIC_API_URL is not set. Release builds need the production API URL (https://...).");
    if (!/^https:\/\/[^/\s]/i.test(fromEnv)) {
      throw new Error(`EXPO_PUBLIC_API_URL must be an https:// URL in release builds (got "${fromEnv}").`);
    }
  }
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return os === "android" ? "http://10.0.2.2:5080" : "http://localhost:5080";
}

// Must be referenced literally so Expo inlines it at build time.
export const API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, Platform.OS);

/**
 * Resolves the public website base URL, used for the privacy policy, terms and account-deletion pages.
 *
 * EXPO_PUBLIC_WEB_URL wins (in development point it at the web dev server, e.g. http://localhost:3000, because the
 * API port does not serve pages). Otherwise the API URL is used: in production the API is served behind the same
 * origin as the site (https://techrat.io), so no extra setting is needed for release builds.
 */
export function resolveWebUrl(envUrl: string | undefined, apiUrl: string): string {
  return (envUrl?.trim() || apiUrl).replace(/\/+$/, "");
}

// Must be referenced literally so Expo inlines it at build time.
export const WEB_URL = resolveWebUrl(process.env.EXPO_PUBLIC_WEB_URL, API_URL);
/** Public pages Google Play requires to be reachable (privacy policy, account deletion) plus the terms. */
export const PRIVACY_URL = `${WEB_URL}/privacy`;
export const TERMS_URL = `${WEB_URL}/terms`;
export const DELETE_ACCOUNT_URL = `${WEB_URL}/account/delete`;
