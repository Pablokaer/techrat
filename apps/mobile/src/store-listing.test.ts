import fs from "node:fs";
import path from "node:path";

const STORE = path.resolve(__dirname, "..", "store");
const LOCALES = ["en-US", "pt-BR"] as const;

/** Google Play Console limits: title 30, short description 80, full description 4000 characters. */
const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };

function listing(locale: string) {
  const file = path.join(STORE, "listing", `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<keyof typeof LIMITS | "reviewerInstructions", string>;
}

describe("Google Play store listing", () => {
  it.each(LOCALES)("%s fits the Play Console limits", (locale) => {
    const data = listing(locale);
    for (const [field, max] of Object.entries(LIMITS)) {
      const text = data[field as keyof typeof LIMITS];
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(max);
    }
  });

  it.each(LOCALES)("%s names the app and has no placeholder left", (locale) => {
    const data = listing(locale);
    expect(data.title).toContain("TechRat");
    for (const text of Object.values(data)) expect(text).not.toMatch(/\b(TODO|TBD)\b|lorem ipsum/);
  });

  it.each(LOCALES)("%s tells reviewers how to sign in", (locale) => {
    expect(listing(locale).reviewerInstructions).toMatch(/\{REVIEW_EMAIL\}.*\{REVIEW_PASSWORD\}|\{REVIEW_PASSWORD\}.*\{REVIEW_EMAIL\}/s);
  });

  it("both languages describe the same questions count as the README catalog", () => {
    const readme = fs.readFileSync(path.resolve(__dirname, "..", "..", "..", "README.md"), "utf8");
    const total = /\*\*([\d,]+)\*\* multiple-choice questions/.exec(readme)?.[1];
    expect(total).toBeDefined();
    const rounded = `${Math.floor(Number(total!.replace(",", "")) / 100) * 100}`;
    const asNumber = (locale: string) => listing(locale).fullDescription.replace(/[.,\s]/g, "");
    for (const locale of LOCALES) expect(asNumber(locale)).toContain(rounded);
  });
});
