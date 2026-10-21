import { screen } from "@testing-library/react";
import type { Metadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import robots from "../../app/robots";
import sitemap from "../../app/sitemap";
import Landing, * as landingModule from "../../app/page";
import PortugueseLanding, { metadata as portugueseMetadata } from "../../app/pt-BR/page";
import { metadata as appMetadata } from "../../app/(app)/layout";
import { metadata as authMetadata } from "../../app/(auth)/layout";
import * as loginLayout from "../../app/(auth)/login/layout";
import * as registerLayout from "../../app/(auth)/register/layout";
import { qk } from "@/lib/queries";
import { renderApp } from "@/test/utils";

const server = vi.hoisted(() => ({ cookie: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "techrat-locale" && server.cookie ? { value: server.cookie } : undefined) }),
  headers: async () => ({ get: () => null }),
}));

beforeEach(() => {
  server.cookie = undefined;
});

const signedOut = (c: import("@tanstack/react-query").QueryClient) => c.setQueryData(qk.me, null);
const LANGUAGES = { en: "/", "pt-BR": "/pt-BR", "x-default": "/" };

/** The JSON-LD graph the page renders for search engines. */
function structuredData(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return JSON.parse(script!.textContent ?? "") as { "@graph": Array<Record<string, unknown>> };
}

describe("robots.txt", () => {
  it("lets crawlers in, keeps them out of the API and points to the sitemap", () => {
    const rules = robots();
    expect(rules.rules).toEqual({ userAgent: "*", allow: "/", disallow: ["/api/", "/hubs/"] });
    expect(rules.sitemap).toBe("https://techrat.io/sitemap.xml");
  });
});

describe("sitemap.xml", () => {
  it("lists every public page with an absolute URL, and the landing in both languages", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("no API in this test"))));
    const entries = await sitemap();
    vi.unstubAllGlobals();
    const urls = entries.map((e) => e.url);
    // Without the API only the fixed pages are listed (public-catalog.test.tsx covers the roadmaps and topics).
    expect(urls).toEqual([
      "https://techrat.io/",
      "https://techrat.io/pt-BR",
      "https://techrat.io/catalog",
      "https://techrat.io/pt-BR/catalog",
      "https://techrat.io/register",
      "https://techrat.io/login",
      "https://techrat.io/privacy",
      "https://techrat.io/terms",
      "https://techrat.io/account/delete",
    ]);
    const languages = { en: "https://techrat.io/", "pt-BR": "https://techrat.io/pt-BR" };
    expect(entries[0].alternates?.languages).toEqual(languages);
    expect(entries[1].alternates?.languages).toEqual(languages);
  });
});

describe("landing page", () => {
  it("is the English version of the site, with a canonical URL and both language alternates", async () => {
    const meta = await landingModule.generateMetadata();
    expect(meta.title).toEqual({ absolute: "TechRat — Tech interview practice and developer roadmaps" });
    expect(meta.alternates).toEqual({ canonical: "/", languages: LANGUAGES });
    expect(meta.openGraph).toMatchObject({ locale: "en_US", url: "/" });
  });

  it("keeps / as its canonical URL when a visitor who chose Portuguese sees it in Portuguese", async () => {
    server.cookie = "pt-BR";
    const meta = await landingModule.generateMetadata();
    expect(meta.title).toEqual({ absolute: "TechRat — Questões de entrevista e roadmaps para devs" });
    expect(meta.alternates).toEqual({ canonical: "/", languages: LANGUAGES });
    expect(meta.openGraph).toMatchObject({ url: "/" });
  });

  it("describes itself to search engines as the TechRat website", () => {
    const { container } = renderApp(<Landing />, signedOut);
    const graph = structuredData(container)["@graph"];
    expect(graph).toContainEqual(expect.objectContaining({ "@type": "WebSite", name: "TechRat", url: "https://techrat.io/", inLanguage: "en" }));
    expect(graph).toContainEqual(expect.objectContaining({ "@type": "Organization", name: "TechRat", logo: "https://techrat.io/brand/rat-192.png" }));
  });
});

describe("Portuguese landing page (/pt-BR)", () => {
  it("is always in Portuguese, whatever the visitor's saved language, so Google can index it", () => {
    const { container } = renderApp(<PortugueseLanding />, signedOut, { locale: "en" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Aprenda. Pratique.");
    const graph = structuredData(container)["@graph"];
    expect(graph).toContainEqual(expect.objectContaining({ "@type": "WebSite", url: "https://techrat.io/pt-BR", inLanguage: "pt-BR" }));
  });

  it("has a Portuguese title, its own canonical URL and the same alternates", () => {
    const meta: Metadata = portugueseMetadata;
    expect(meta.title).toEqual({ absolute: "TechRat — Questões de entrevista e roadmaps para devs" });
    expect(meta.description).toMatch(/2\.900\+ questões/);
    expect(meta.alternates).toEqual({ canonical: "/pt-BR", languages: LANGUAGES });
    expect(meta.openGraph).toMatchObject({ locale: "pt_BR", url: "/pt-BR" });
  });
});

describe("what stays out of the index", () => {
  it("the signed-in area: its pages are empty for a crawler that cannot sign in", () => {
    expect(appMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("the account utility pages (confirm email, forgot and reset password)", () => {
    expect(authMetadata.robots).toEqual({ index: false, follow: true });
  });

  it.each([
    ["sign in", loginLayout, "/login", "Sign in", "Entrar"],
    ["create account", registerLayout, "/register", "Create your free account", "Crie sua conta grátis"],
  ] as const)("the %s page stays indexable, with its own title in the visitor's language", async (_name, layout, path, en, pt) => {
    const meta = await layout.generateMetadata();
    expect(meta).toMatchObject({ title: en, robots: { index: true, follow: true }, alternates: { canonical: path } });
    expect(meta.description).toBeTruthy();
    server.cookie = "pt-BR";
    expect((await layout.generateMetadata()).title).toBe(pt);
  });
});
