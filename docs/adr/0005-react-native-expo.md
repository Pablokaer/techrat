# ADR-0005: React Native with Expo for mobile

**Status:** Accepted

Expo SDK 57 (React Native 0.86, React 19.2.3 pinned repo-wide) with expo-router. The mobile app reuses `@techrat/types`, `@techrat/api`, `@techrat/auth`, `@techrat/validation` and `@techrat/theme` from the npm workspace; Metro resolves the monorepo with its default config.

Auth uses bearer + refresh tokens (`BearerSession`) stored in `expo-secure-store` (Keychain/Keystore). Business rules stay in the API; the app only renders state the API returns.
