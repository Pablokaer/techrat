import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as loginLayout from "../../app/(visitor-language)/(auth)/login/layout";
import * as registerLayout from "../../app/(visitor-language)/(auth)/register/layout";
import * as privacyModule from "../../app/(visitor-language)/privacy/page";
import PrivacyPage from "../../app/(visitor-language)/privacy/page";
import sitemap from "../../app/sitemap";
import { LOCALES } from "@/i18n/config";
import { PUBLIC_SITEMAP_PAGES, publicPageMetadata, publicPages, sitemapEntries, siteUrl } from "@/lib/public-pages";
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

describe("link previews of the sign-in pages", () => {
  // They used to inherit the root Open Graph (landing title, url "/"), so a shared /login link previewed as the landing.
  it.each([
    ["sign in", loginLayout, "/login", "Sign in", "Entrar"],
    ["create account", registerLayout, "/register", "Create your free account", "Crie sua conta grátis"],
  ] as const)("the %s page describes itself in Open Graph and Twitter cards", async (_name, layout, url, en, pt) => {
    const meta = await layout.generateMetadata();
    expect(meta.openGraph).toEqual({ type: "website", siteName: "TechRat", locale: "en_US", url, title: en, description: meta.description });
    expect(meta.twitter).toEqual({ card: "summary_large_image", title: en, description: meta.description });
    server.cookie = "pt-BR";
    expect((await layout.generateMetadata()).openGraph).toMatchObject({ locale: "pt_BR", url, title: pt });
  });

  it("a legal page's Twitter card has its own title, not the landing page's", async () => {
    const meta = await privacyModule.generateMetadata();
    expect(meta.twitter).toEqual({ card: "summary_large_image", title: "Privacy Policy", description: meta.description });
  });
});

describe("one description of the public pages", () => {
  const texts = { title: "Title", description: "Description" };

  it("gives a page with a URL per language its own canonical, both languages and x-default (English)", () => {
    const page = publicPages.catalog("roadmaps", "backend-developer");
    const meta = publicPageMetadata(page, { locale: "pt-BR", ...texts });
    expect(meta.alternates).toEqual({
      canonical: "/pt-BR/catalog/roadmaps/backend-developer",
      languages: { en: "/catalog/roadmaps/backend-developer", "pt-BR": "/pt-BR/catalog/roadmaps/backend-developer", "x-default": "/catalog/roadmaps/backend-developer" },
    });
    expect(meta.openGraph).toEqual({ type: "website", siteName: "TechRat", locale: "pt_BR", url: "/pt-BR/catalog/roadmaps/backend-developer", ...texts });
    expect(meta.twitter).toEqual({ card: "summary_large_image", ...texts });
  });

  it("gives a page with one adaptive URL a canonical and no language alternates", () => {
    const meta = publicPageMetadata(publicPages.terms, { locale: "pt-BR", ...texts });
    expect(meta.alternates).toEqual({ canonical: "/terms" });
    expect(meta.openGraph).toMatchObject({ locale: "pt_BR", url: "/terms" });
  });

  it("lists in the sitemap exactly the canonical URLs the pages declare, so the two cannot disagree", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("no API in this test"))));
    const urls = (await sitemap()).map((e) => e.url);
    vi.unstubAllGlobals();
    const canonicals = PUBLIC_SITEMAP_PAGES.flatMap((page) =>
      [...new Set(LOCALES.map((locale) => `${siteUrl()}${publicPageMetadata(page, { locale, ...texts }).alternates?.canonical}`))],
    );
    expect(urls).toEqual(canonicals);
  });

  it("links the language versions of a page to each other in the sitemap, and lists an adaptive page once", () => {
    const landing = sitemapEntries(publicPages.landing);
    expect(landing.map((e) => e.alternates?.languages)).toEqual([
      { en: "https://techrat.io/", "pt-BR": "https://techrat.io/pt-BR" },
      { en: "https://techrat.io/", "pt-BR": "https://techrat.io/pt-BR" },
    ]);
    expect(sitemapEntries(publicPages.login)).toEqual([{ url: "https://techrat.io/login", changeFrequency: "monthly", priority: 0.5 }]);
  });
});

describe("public page frame", () => {
  it("offers the language switcher, not a link to another URL, on a page with one adaptive URL", () => {
    renderApp(<PrivacyPage />, signedOut);
    expect(document.querySelector("a[hreflang]")).toBeNull();
    expect(screen.getByRole("link", { name: "TechRat home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});
