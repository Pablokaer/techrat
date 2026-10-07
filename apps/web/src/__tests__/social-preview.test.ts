import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMetadata, siteUrl } from "@/lib/site-metadata";

const appDir = path.resolve(__dirname, "../../app");

/** Reads width/height from the PNG IHDR chunk. */
function pngSize(file: string) {
  const buf = readFileSync(path.join(appDir, file));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

afterEach(() => vi.unstubAllEnvs());

describe("social link preview", () => {
  it("resolves the public site URL from PUBLIC_WEB_URL, without a trailing slash, defaulting to production", () => {
    expect(siteUrl()).toBe("https://techrat.io");
    vi.stubEnv("PUBLIC_WEB_URL", "https://staging.example.com/");
    expect(siteUrl()).toBe("https://staging.example.com");
  });

  it("sets metadataBase so crawlers get absolute image URLs", () => {
    expect(String(buildMetadata("en").metadataBase)).toBe("https://techrat.io/");
  });

  it.each([
    ["en", "en_US", "TechRat — Learn. Practice. Level Up."],
    ["pt-BR", "pt_BR", "TechRat — Aprenda. Pratique. Suba de nível."],
  ] as const)("describes the page for %s in Open Graph and Twitter cards", (locale, ogLocale, title) => {
    const meta = buildMetadata(locale);
    expect(meta.openGraph).toMatchObject({ type: "website", siteName: "TechRat", locale: ogLocale, title, url: "/" });
    expect(meta.openGraph?.description).toBe(meta.description);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title, description: meta.description });
  });

  it("ships 1200x630 preview images at the file-convention paths Next.js picks up", () => {
    expect(pngSize("opengraph-image.png")).toEqual({ width: 1200, height: 630 });
    expect(pngSize("twitter-image.png")).toEqual({ width: 1200, height: 630 });
  });
});
