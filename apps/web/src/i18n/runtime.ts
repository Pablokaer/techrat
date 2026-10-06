import { DEFAULT_LOCALE, type Locale } from "./config";

// The active locale outside React: API requests read it to send Accept-Language.
let current: Locale = DEFAULT_LOCALE;

export function setRequestLocale(locale: Locale) {
  current = locale;
}

export function getRequestLocale(): Locale {
  return current;
}

/** fetch that tells the API which language to answer in (catalog names, validation messages, emails). */
export const localizedFetch: typeof fetch = (input, init) => {
  const request = new Request(input, init);
  request.headers.set("Accept-Language", current);
  return fetch(request);
};
