import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "@techrat/auth";

/** Keychain (iOS) / Keystore-backed (Android) storage for the bearer + refresh tokens. */
export const secureTokenStorage: TokenStorage = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};
