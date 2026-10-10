import { getLocale, localizedFetch, matchLocale, messages, setLocale, translations } from "./i18n";

afterEach(() => setLocale("en"));

describe("matchLocale", () => {
  it.each([
    [["pt-BR"], "pt-BR"],
    [["pt-PT", "en"], "pt-BR"],
    [["pt"], "pt-BR"],
    [["en-US", "pt-BR"], "en"],
    [["de-DE", "fr"], "en"],
    [[], "en"],
  ] as const)("maps %j to %s", (tags, expected) => {
    expect(matchLocale(tags)).toBe(expected);
  });
});

describe("messages", () => {
  /** The same shape in both languages: a text added to one and forgotten in the other must fail here. */
  function shape(value: unknown): unknown {
    if (typeof value === "function") return "fn";
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
    return typeof value;
  }

  it("has the same keys in English and Portuguese", () => {
    expect(shape(translations["pt-BR"])).toEqual(shape(translations.en));
  });

  it("never leaves a Portuguese text empty", () => {
    const empty: string[] = [];
    (function walk(node: unknown, path: string) {
      if (typeof node === "string") { if (!node.trim()) empty.push(path); }
      else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    })(translations["pt-BR"], "pt-BR");
    expect(empty).toEqual([]);
  });

  it("follows the active locale", () => {
    setLocale("pt-BR");
    expect(getLocale()).toBe("pt-BR");
    expect(messages().profile.version("1.0.0")).toBe("Versão 1.0.0");
    setLocale("en");
    expect(messages().profile.version("1.0.0")).toBe("Version 1.0.0");
  });
});

describe("localizedFetch", () => {
  it("tells the API which language to answer in (validation messages, emails)", async () => {
    const spy = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    setLocale("pt-BR");
    await localizedFetch("https://techrat.io/api/v1/users/me", { headers: { Authorization: "Bearer t" } });
    const sent = spy.mock.calls[0][0] as Request;
    expect(sent.headers.get("Accept-Language")).toBe("pt-BR");
    expect(sent.headers.get("Authorization")).toBe("Bearer t");
    spy.mockRestore();
  });
});

describe("email confirmation texts", () => {
  it("has natural Portuguese variants that mention the address and the 24 hours", () => {
    const pt = translations["pt-BR"].emailConfirmation;
    expect(pt.checkBody("a@b.com")).toContain("a@b.com");
    expect(pt.checkBody("a@b.com")).toContain("24 horas");
    expect(pt.resend).not.toBe(translations.en.emailConfirmation.resend);
    expect(pt.resendSent).not.toBe(translations.en.emailConfirmation.resendSent);
  });
});
