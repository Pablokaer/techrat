import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/config";
import { pageLocale } from "@/i18n/server";

const request = vi.hoisted(() => ({ cookie: undefined as string | undefined, acceptLanguage: null as string | null, reads: 0 }));
vi.mock("next/headers", () => ({
  cookies: async () => {
    request.reads++;
    return { get: (name: string) => (name === "techrat-locale" && request.cookie ? { value: request.cookie } : undefined) };
  },
  headers: async () => {
    request.reads++;
    return { get: (name: string) => (name === "accept-language" ? request.acceptLanguage : null) };
  },
}));

beforeEach(() => {
  request.reads = 0;
});
afterEach(() => vi.unstubAllEnvs());

type Case = { fixed?: Locale; cookie?: string; acceptLanguage?: string; desktop?: boolean; locale: Locale; detect: boolean };

describe("the language of a page (pageLocale)", () => {
  it.each<[string, Case]>([
    ["a URL-fixed language wins over the saved choice and the browser", { fixed: "pt-BR", cookie: "en", acceptLanguage: "en-US", locale: "pt-BR", detect: false }],
    ["an English URL stays English for a visitor who chose Portuguese", { fixed: "en", cookie: "pt-BR", acceptLanguage: "pt-BR", locale: "en", detect: false }],
    ["a URL-fixed language needs no request, so it also holds in the desktop export", { fixed: "pt-BR", desktop: true, locale: "pt-BR", detect: false }],
    ["the saved choice wins over the browser", { cookie: "pt-BR", acceptLanguage: "en-US,en;q=0.9", locale: "pt-BR", detect: false }],
    ["an unknown saved value is ignored in favour of the browser", { cookie: "fr", acceptLanguage: "pt-PT,pt;q=0.9", locale: "pt-BR", detect: false }],
    ["the browser's preferred supported language", { acceptLanguage: "fr-FR,fr;q=0.9,pt;q=0.5", locale: "pt-BR", detect: false }],
    ["English for a browser with no supported language", { acceptLanguage: "fr-FR", locale: "en", detect: false }],
    ["English for a crawler that sends no cookie and no Accept-Language", { locale: "en", detect: false }],
    ["the desktop export has no request: English on the server, detected on the client", { cookie: "pt-BR", acceptLanguage: "pt-BR", desktop: true, locale: "en", detect: true }],
  ])("%s", async (_name, { fixed, cookie, acceptLanguage, desktop, locale, detect }) => {
    request.cookie = cookie;
    request.acceptLanguage = acceptLanguage ?? null;
    if (desktop) vi.stubEnv("BUILD_TARGET", "desktop");
    expect(await pageLocale(fixed)).toEqual({ locale, detect });
  });

  it("does not read the request when the language is fixed by the URL or there is no request", async () => {
    await pageLocale("pt-BR");
    vi.stubEnv("BUILD_TARGET", "desktop");
    await pageLocale();
    // Reading cookies() makes a route dynamic and is an error during the desktop static export.
    expect(request.reads).toBe(0);
  });
});
