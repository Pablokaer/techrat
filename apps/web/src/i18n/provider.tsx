"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_STORAGE_KEY, isLocale, matchLocale, type Locale } from "./config";
import { setRequestLocale } from "./runtime";
import { messages, type Messages } from "./messages";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const I18nContext = createContext<I18nContextValue>({ locale: DEFAULT_LOCALE, setLocale: () => {}, t: messages[DEFAULT_LOCALE] });

/** Messages for the active locale: `const t = useT(); t.dashboard.title`. */
export const useT = () => useContext(I18nContext).t;
export const useLocale = () => {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
};

function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  const cookie = document.cookie.split("; ").find((c) => c.startsWith(`${LOCALE_COOKIE}=`))?.split("=")[1];
  return isLocale(cookie) ? cookie : null;
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* storage unavailable */
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/** The locale this browser should use: the saved choice, else the browser languages. */
export function detectClientLocale(): Locale {
  return readStoredLocale() ?? matchLocale(typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language]);
}

/**
 * Holds the active locale. `initialLocale` comes from the server (web: cookie or Accept-Language) so the
 * server-rendered HTML matches the first client render. Without it the provider starts in the default locale,
 * or, when `detect` is set (desktop static export), in the browser's locale. The desktop shell renders no
 * content until the session is restored, so starting from the detected locale cannot cause a hydration mismatch.
 */
export function I18nProvider({
  initialLocale,
  detect = false,
  onLocaleChange,
  children,
}: {
  initialLocale?: Locale;
  detect?: boolean;
  onLocaleChange?: (locale: Locale) => void;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    () => initialLocale ?? (detect && typeof window !== "undefined" ? detectClientLocale() : DEFAULT_LOCALE),
  );
  setRequestLocale(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      persistLocale(next);
      setRequestLocale(next);
      setLocaleState(next);
      onLocaleChange?.(next);
    },
    [onLocaleChange],
  );

  const value = useMemo(() => ({ locale, setLocale, t: messages[locale] }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
