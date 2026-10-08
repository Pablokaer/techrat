/**
 * Minimal i18n for the mobile app (English and Brazilian Portuguese), added with the Play Store release work.
 *
 * Only the screens written since then use it: the rest of the app is still English-only (see "Known limitations" in
 * the README). The active locale is the device's, read once at startup, so there is no provider or switcher: the
 * messages are plain objects, and `Messages` is derived from the English object so the compiler fails when the
 * Portuguese one lacks a text (i18n.test.ts also checks the shape at run time).
 */

export const LOCALES = ["en", "pt-BR"] as const;
export type Locale = (typeof LOCALES)[number];

/** Any Portuguese variant maps to pt-BR; anything else falls back to English. */
export function matchLocale(tags: readonly string[]): Locale {
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag.startsWith("pt")) return "pt-BR";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

/** The device language, through Intl (available in Hermes), without an extra native dependency. */
function detectLocale(): Locale {
  try {
    return matchLocale([Intl.DateTimeFormat().resolvedOptions().locale]);
  } catch {
    return "en";
  }
}

let current: Locale = detectLocale();

export const getLocale = (): Locale => current;
/** For tests and for a future language setting. */
export const setLocale = (locale: Locale) => {
  current = locale;
};

const en = {
  profile: {
    version: (version: string) => `Version ${version}`,
  },
};

export type Messages = typeof en;

const ptBR: Messages = {
  profile: {
    version: (version) => `Versão ${version}`,
  },
};

export const translations: Record<Locale, Messages> = { en, "pt-BR": ptBR };

/** The messages of the active locale. */
export const messages = (): Messages => translations[current];

/** React hook form of `messages()`: the locale is fixed for the app's lifetime, so it never needs to re-render. */
export const useT = messages;

/** fetch that tells the API which language to answer in (validation messages, emails). */
export const localizedFetch: typeof fetch = (input, init) => {
  const request = new Request(input, init);
  request.headers.set("Accept-Language", current);
  return fetch(request);
};
