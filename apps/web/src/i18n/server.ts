import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, matchLocale, parseAcceptLanguage, type Locale } from "./config";

/** The language a page is rendered in on the server, and whether the client still has to find the real one. */
export interface PageLocale {
  /** `<html lang>`, metadata and the provider's first render. */
  locale: Locale;
  /**
   * True when there was no request to read (the desktop static export): `locale` is only the default and the client
   * detects the visitor's language after mount (saved choice, else the browser languages).
   */
  detect: boolean;
}

/** The desktop build is a static export: pages are rendered once at build time, with no visitor and no request. */
const hasRequest = () => process.env.BUILD_TARGET !== "desktop";

/**
 * The one owner of "the language of this page" (server only, ADR-0040), in order of precedence:
 * 1. `fixed`: the language of the URL (the /pt-BR tree and the English catalog are one URL per language for search
 *    engines), whatever the visitor saved;
 * 2. the saved choice (`techrat-locale` cookie);
 * 3. the browser's Accept-Language;
 * 4. with no request at all (desktop export), the default, and `detect` tells the client to find the real one.
 * A fixed language never reads the request, so those pages can stay static.
 */
export async function pageLocale(fixed?: Locale): Promise<PageLocale> {
  if (fixed) return { locale: fixed, detect: false };
  if (!hasRequest()) return { locale: DEFAULT_LOCALE, detect: true };
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return { locale: saved, detect: false };
  return { locale: matchLocale(parseAcceptLanguage((await headers()).get("accept-language"))), detect: false };
}
