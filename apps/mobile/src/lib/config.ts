import { Platform } from "react-native";

/**
 * Resolves the API base URL. EXPO_PUBLIC_API_URL wins; otherwise the Android emulator reaches the
 * host machine through 10.0.2.2, while iOS simulator / web use localhost.
 */
export function resolveApiUrl(envUrl: string | undefined, os: string): string {
  const fromEnv = envUrl?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return os === "android" ? "http://10.0.2.2:5080" : "http://localhost:5080";
}

// Must be referenced literally so Expo inlines it at build time.
export const API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, Platform.OS);
