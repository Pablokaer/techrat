import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, matchLocale, parseAcceptLanguage, type Locale } from "./config";

/**
 * Locale of the current web request (server only): the saved choice (cookie), else the browser's Accept-Language.
 * The desktop build is a static export with no request to read, so it always gets the default and the client detects
 * the real locale after mount.
 */
export async function requestLocale(): Promise<Locale> {
  if (process.env.BUILD_TARGET === "desktop") return DEFAULT_LOCALE;
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return matchLocale(parseAcceptLanguage((await headers()).get("accept-language")));
}
