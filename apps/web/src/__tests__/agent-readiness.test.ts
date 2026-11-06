import { readdirSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "../../proxy.web";
import { GET as llmsTxt } from "../../app/llms.txt/route";
import { isKnownRoute, prefersMarkdown } from "@/lib/agent-content";
import { landingStructuredData } from "@/lib/public-pages";

const request = (pathname: string, headers: Record<string, string> = {}) => new NextRequest(new URL(pathname, "https://techrat.io"), { headers });
const asAgent = (pathname: string, extra: Record<string, string> = {}) => proxy(request(pathname, { accept: "text/markdown", ...extra }));
/** NextResponse.next(): the request goes on to the page, which renders HTML. */
const passesThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";
const vary = (res: Response) => (res.headers.get("vary") ?? "").split(",").map((v) => v.trim().toLowerCase());

describe("prefersMarkdown (Accept header)", () => {
  it.each([
    ["text/markdown", true],
    ["text/markdown, text/html;q=0.9", true],
    ["text/html, text/markdown;q=0.5", false],
    ["text/plain, text/markdown", true],
    ["TEXT/MARKDOWN; charset=utf-8", true],
    ["text/markdown;q=0", false],
    // What browsers send: HTML first, so they keep getting the page.
    ["text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", false],
    ["*/*", false],
    ["", false],
  ])("%s → %s", (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });
});

describe("home page as Markdown (acceptmarkdown.com)", () => {
  it("answers an agent that asks for text/markdown with a Markdown version of / that varies on Accept", async () => {
    const res = asAgent("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(vary(res)).toContain("accept");
    const body = await res.text();
    expect(body).toMatch(/^# TechRat — Tech interview practice and developer roadmaps\n/);
    expect(body).toContain("2,900+ real questions");
    expect(body).toContain("[Explore roadmaps and topics](https://techrat.io/catalog)");
    expect(body).toContain("(https://techrat.io/llms.txt)");
  });

  it("serves /pt-BR in Portuguese", async () => {
    const body = await asAgent("/pt-BR").text();
    expect(body).toMatch(/^# TechRat — Questões de entrevista e roadmaps para devs\n/);
    expect(body).toContain("(https://techrat.io/pt-BR/catalog)");
  });

  it("keeps serving the HTML page to browsers", () => {
    expect(passesThrough(proxy(request("/", { accept: "text/html,application/xhtml+xml,*/*;q=0.8" })))).toBe(true);
  });

});

describe("agent-friendly 404", () => {
  it("answers an unknown URL with 404 and a Markdown body pointing to llms.txt and the sitemap", async () => {
    const res = asAgent("/__ora-404-probe-63ig1a52");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(vary(res)).toContain("accept");
    const body = await res.text();
    expect(body).toMatch(/^# Page not found \(404\)/);
    expect(body).toContain("(https://techrat.io/llms.txt)");
    expect(body).toContain("(https://techrat.io/sitemap.xml)");
  });

  it("is in Portuguese for an agent that asks for Portuguese", async () => {
    const body = await asAgent("/nada-aqui", { "accept-language": "pt-BR,pt;q=0.9" }).text();
    expect(body).toMatch(/^# Página não encontrada \(404\)/);
  });

  it("leaves real pages to Next.js, which renders them (or their own 404) as HTML", () => {
    for (const path of ["/catalog", "/pt-BR/catalog/roadmaps/junior-to-senior", "/login", "/practice/session"]) {
      expect(passesThrough(asAgent(path))).toBe(true);
    }
  });

  it("leaves browsers on the HTML 404 page", () => {
    expect(passesThrough(proxy(request("/nothing-here", { accept: "text/html" })))).toBe(true);
  });
});

describe("known routes", () => {
  /** Every page route in app/, as a URL (route groups dropped, dynamic segments filled in). */
  function pageRoutes(dir: string, segments: string[] = []): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) {
        const segment = /^\(.*\)$/.test(entry.name) ? [] : [entry.name.replace(/^\[.*\]$/, "some-slug")];
        return pageRoutes(path.join(dir, entry.name), [...segments, ...segment]);
      }
      return /^page\.(web\.)?tsx$/.test(entry.name) ? [`/${segments.join("/")}`] : [];
    });
  }

  it("include every page in app/, so no real page answers an agent with the Markdown 404", () => {
    const routes = pageRoutes(path.resolve(__dirname, "../../app"));
    expect(routes.length).toBeGreaterThan(20);
    expect(routes.filter((r) => !isKnownRoute(r))).toEqual([]);
  });

  it("do not include made-up paths", () => {
    expect(isKnownRoute("/__ora-404-probe-63ig1a52")).toBe(false);
    expect(isKnownRoute("/catalog/roadmaps")).toBe(false);
    expect(isKnownRoute("/catalog/roadmaps/a/b")).toBe(false);
  });

  it("are the only paths the proxy runs on: not the API, the hub, Next.js assets or files", () => {
    const [matcher] = config.matcher;
    const runs = (p: string) => new RegExp(`^${matcher}$`).test(p);
    expect(["/", "/pt-BR", "/__ora-404-probe-63ig1a52", "/catalog"].every(runs)).toBe(true);
    expect(["/api/auth/me", "/hubs/notifications", "/_next/static/x.js", "/llms.txt", "/robots.txt", "/brand/rat-192.png"].some(runs)).toBe(false);
  });
});

describe("llms.txt (llmstxt.org)", () => {
  it("follows the format: H1 name, blockquote summary, then H2 sections of Markdown links", async () => {
    const res = await llmsTxt();
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await res.text();
    const lines = body.split("\n");
    expect(lines[0]).toBe("# TechRat");
    expect(lines[1]).toBe("");
    expect(lines[2]).toMatch(/^> .*tech interview/);
    // Every link points to the site itself, absolute.
    for (const [, url] of body.matchAll(/\]\(([^)]+)\)/g)) expect(url).toMatch(/^https:\/\/(techrat\.io|github\.com)\//);
    expect(body).toMatch(/\n## Docs\n\n- \[[^\]]+\]\(https:\/\/techrat\.io\/catalog\)/);
    expect(body).toContain("\n## Optional\n");
  });

  it("tells agents when to reach for TechRat and how to use it", async () => {
    const body = await (await llmsTxt()).text();
    const section = body.split("\n## When to use TechRat\n")[1]?.split("\n## ")[0] ?? "";
    expect(section).toMatch(/interview/);
    expect(section).toMatch(/roadmap/i);
    expect(section).toMatch(/Accept: text\/markdown/);
    expect(section).toMatch(/not .*for/i);
  });
});

describe("structured data for brand searches", () => {
  it("describes the organization and names its products, in each language", () => {
    const org = (locale: "en" | "pt-BR") => landingStructuredData(locale)["@graph"].find((n) => n["@type"] === "Organization")!;
    expect(org("en")).toMatchObject({ description: expect.stringContaining("tech interview"), knowsAbout: expect.arrayContaining(["Tech interview practice", "Developer roadmaps"]) });
    expect(org("pt-BR")).toMatchObject({ description: expect.stringContaining("entrevista"), knowsAbout: expect.arrayContaining(["Roadmaps para devs"]) });
  });
});
