import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VisitorLanguageLayout, { generateMetadata as visitorMetadata } from "../../app/(visitor-language)/layout";
import EnglishCatalogLayout, { generateMetadata as englishCatalogMetadata } from "../../app/catalog/layout.web";
import PortugueseLayout, { generateMetadata as portugueseMetadata } from "../../app/pt-BR/layout";
import PortugueseLanding from "../../app/pt-BR/page";
import PtCatalogRoute from "../../app/pt-BR/catalog/page.web";
import CatalogRoute from "../../app/catalog/page.web";
import GlobalNotFound from "../../app/global-not-found";
import { getRequestLocale, localizedFetch } from "@/i18n/runtime";

/*
 * Each language owner is a root layout (ADR-0040): the /pt-BR tree and the English catalog fix the language by URL, the
 * rest of the site follows the visitor. These tests render a root layout around a real page, as the server does.
 */

vi.mock("next/font/local", () => ({ default: () => ({ variable: "font" }) }));
// Catalog pages call connection() to render per request; outside Next.js there is no request scope to check.
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), connection: async () => {} }));

const request = vi.hoisted(() => ({ cookie: undefined as string | undefined, acceptLanguage: null as string | null }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "techrat-locale" && request.cookie ? { value: request.cookie } : undefined) }),
  headers: async () => ({ get: (name: string) => (name === "accept-language" ? request.acceptLanguage : null) }),
}));

/** Every I18nProvider that renders, with the language it starts in: one per page, never one inside another. */
const providers = vi.hoisted(() => [] as Array<string | undefined>);
vi.mock("@/i18n/provider", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/i18n/provider")>();
  return {
    ...original,
    I18nProvider: (props: Parameters<typeof original.I18nProvider>[0]) => {
      providers.push(props.initialLocale);
      return original.I18nProvider(props);
    },
  };
});

/** The catalog API, answering in whatever language it is asked. */
function fakeApi(url: string | URL | Request, init?: RequestInit) {
  const path = new URL(url instanceof Request ? url.url : url).pathname;
  void init;
  return Promise.resolve(Response.json(path.endsWith("/roadmaps") || path.endsWith("/topics") ? [] : {}));
}

beforeEach(() => {
  request.cookie = undefined;
  request.acceptLanguage = null;
  providers.length = 0;
  vi.stubGlobal("fetch", vi.fn(fakeApi));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

type Layout = (props: { children: ReactNode }) => Promise<ReactNode>;
const serverRender = async (layout: Layout, page: ReactNode) => renderToStaticMarkup(await layout({ children: page }));
const htmlLang = (html: string) => /^<html lang="([^"]+)"/.exec(html)?.[1];

describe("the /pt-BR tree", () => {
  it("is served as Portuguese to a crawler, which sends no cookie and no Accept-Language", async () => {
    const html = await serverRender(PortugueseLayout, <PortugueseLanding />);
    expect(htmlLang(html)).toBe("pt-BR");
    expect(html).toContain("Aprenda. Pratique.");
  });

  it("stays Portuguese for a visitor whose saved language is English, with a single language provider", async () => {
    request.cookie = "en";
    request.acceptLanguage = "en-US";
    const html = await serverRender(PortugueseLayout, <PortugueseLanding />);
    expect(htmlLang(html)).toBe("pt-BR");
    expect(html).toContain("Aprenda. Pratique.");
    expect(providers).toEqual(["pt-BR"]);
  });

  it("asks the API in Portuguese", async () => {
    request.cookie = "en";
    await serverRender(PortugueseLayout, <PortugueseLanding />);
    expect(getRequestLocale()).toBe("pt-BR");
    await localizedFetch("http://localhost:5080/api/v1/users/me");
    const sent = vi.mocked(fetch).mock.calls.at(-1)![0] as Request;
    expect(sent.headers.get("Accept-Language")).toBe("pt-BR");
  });

  it("includes the Portuguese catalog, with one provider and lang=pt-BR", async () => {
    request.cookie = "en";
    const html = await serverRender(PortugueseLayout, await PtCatalogRoute());
    expect(htmlLang(html)).toBe("pt-BR");
    expect(html).toContain("Roadmaps e temas");
    expect(providers).toEqual(["pt-BR"]);
  });

  it("has Portuguese site metadata", async () => {
    request.cookie = "en";
    expect((await portugueseMetadata()).openGraph).toMatchObject({ locale: "pt_BR" });
  });
});

describe("the English catalog", () => {
  it("is English for a visitor who chose Portuguese, with one provider", async () => {
    request.cookie = "pt-BR";
    const html = await serverRender(EnglishCatalogLayout, await CatalogRoute());
    expect(htmlLang(html)).toBe("en");
    expect(providers).toEqual(["en"]);
    expect((await englishCatalogMetadata()).openGraph).toMatchObject({ locale: "en_US" });
  });
});

describe("the rest of the site", () => {
  it.each([
    ["English for a crawler", undefined, null, "en"],
    ["the saved language", "pt-BR", "en-US", "pt-BR"],
    ["the browser language", undefined, "pt-BR,pt;q=0.9", "pt-BR"],
  ] as const)("follows the visitor: %s", async (_name, cookie, acceptLanguage, lang) => {
    request.cookie = cookie;
    request.acceptLanguage = acceptLanguage;
    const html = await serverRender(VisitorLanguageLayout, <p>page</p>);
    expect(htmlLang(html)).toBe(lang);
    expect(providers).toEqual([lang]);
    expect((await visitorMetadata()).openGraph).toMatchObject({ locale: lang === "en" ? "en_US" : "pt_BR" });
  });

  it("in the desktop export (no request) starts in English and lets the client detect the language", async () => {
    vi.stubEnv("BUILD_TARGET", "desktop");
    request.cookie = "pt-BR";
    const html = await serverRender(VisitorLanguageLayout, <p>page</p>);
    expect(htmlLang(html)).toBe("en");
    expect(providers).toEqual([undefined]);
  });
});

describe("a URL that matches no page", () => {
  // With one root layout per language owner there is no layout above all pages, so Next.js renders this file on its own.
  it.each([
    [undefined, "en", "Page not found", "Back to the home page"],
    ["pt-BR", "pt-BR", "Página não encontrada", "Voltar para a página inicial"],
  ] as const)("gets the site's document in the visitor's language (cookie %s)", async (cookie, lang, title, home) => {
    request.cookie = cookie;
    const html = renderToStaticMarkup(await GlobalNotFound());
    expect(htmlLang(html)).toBe(lang);
    expect(html).toContain(title);
    expect(html).toContain(home);
    expect(providers).toEqual([lang]);
  });
});
