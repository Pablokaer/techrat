import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fieldErrors, registerSchema } from "@techrat/validation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Providers } from "@/components/providers";
import { I18nProvider, useFormat, useLocale, useT, useValidationTranslator } from "@/i18n";
import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, matchLocale, parseAcceptLanguage, type Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { getRequestLocale, localizedFetch, setRequestLocale } from "@/i18n/runtime";
import { me } from "@/test/utils";
import { qk } from "@/lib/queries";

function clearLocaleState() {
  window.localStorage.clear();
  document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
  document.documentElement.lang = "en";
  setRequestLocale("en");
}

beforeEach(clearLocaleState);
afterEach(() => vi.restoreAllMocks());

describe("locale detection", () => {
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

  it("orders Accept-Language tags by quality and ignores wildcards", () => {
    expect(parseAcceptLanguage("en;q=0.5, pt-BR, *;q=0.1")).toEqual(["pt-BR", "en"]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(matchLocale(parseAcceptLanguage("de;q=0.9, pt;q=0.8"))).toBe("pt-BR");
  });
});

describe("message catalogs", () => {
  // Types already require the same keys; this also covers the Record<string, string> maps and empty strings.
  function shape(value: unknown, path = ""): string[] {
    if (typeof value === "function") return [`${path}()`];
    if (Array.isArray(value)) return [`${path}[${value.length}]`];
    if (value && typeof value === "object")
      return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k)).sort();
    return [path];
  }
  // Fragments around a highlighted word (`…Before` / `…After`) may be empty, depending on word order.
  function emptyStrings(value: unknown, path = ""): string[] {
    if (typeof value === "string") return value.trim() || /(Before|After)$/.test(path) ? [] : [path];
    if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => emptyStrings(v, `${path}.${k}`));
    return [];
  }

  it("Portuguese has exactly the same keys as English", () => {
    expect(shape(messages["pt-BR"])).toEqual(shape(messages.en));
  });

  it("no message is empty", () => {
    expect(emptyStrings(messages.en)).toEqual([]);
    expect(emptyStrings(messages["pt-BR"])).toEqual([]);
  });

  it("parameterised messages produce different text per language", () => {
    expect(messages.en.common.level(3)).toBe("Level 3");
    expect(messages["pt-BR"].common.level(3)).toBe("Nível 3");
  });
});

function Probe() {
  const t = useT();
  return <p data-testid="probe">{t.common.loading}</p>;
}

describe("I18nProvider + LanguageSwitcher", () => {
  it("starts in the server locale and switches, persisting the choice", async () => {
    const onLocaleChange = vi.fn();
    render(
      <I18nProvider initialLocale="en" onLocaleChange={onLocaleChange}>
        <LanguageSwitcher />
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("Loading");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Português" }));

    expect(screen.getByTestId("probe")).toHaveTextContent("Carregando");
    expect(screen.getByRole("group", { name: "Escolher idioma" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Português" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("pt-BR");
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=pt-BR`);
    expect(getRequestLocale()).toBe("pt-BR");
    expect(onLocaleChange).toHaveBeenCalledWith("pt-BR");
  });

  it("without a server locale stays in English unless detection is on", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "pt-BR");
    const { unmount } = render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId("probe")).toHaveTextContent("Loading");
    unmount();

    render(<I18nProvider detect><Probe /></I18nProvider>);
    expect(screen.getByTestId("probe")).toHaveTextContent("Carregando");
  });

  it("detection falls back to the browser languages", () => {
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["pt-PT", "en"]);
    render(<I18nProvider detect><Probe /></I18nProvider>);
    expect(screen.getByTestId("probe")).toHaveTextContent("Carregando");
  });

  it("a server locale wins over the stored one (it already reflects the cookie)", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    render(<I18nProvider initialLocale="pt-BR" detect><Probe /></I18nProvider>);
    expect(screen.getByTestId("probe")).toHaveTextContent("Carregando");
  });
});

describe("Providers", () => {
  it("refetches API data in the new language after a switch", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(qk.me, me);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    render(<Providers client={client} initialLocale="en"><LanguageSwitcher /></Providers>);

    await userEvent.click(screen.getByRole("button", { name: "Português" }));

    expect(invalidate).toHaveBeenCalled();
  });
});

describe("API requests", () => {
  it("send the active language as Accept-Language", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockClear();
    setRequestLocale("pt-BR");
    await localizedFetch("http://localhost/api/v1/topics");
    const request = fetchMock.mock.calls.at(-1)![0] as Request;
    expect(request.headers.get("Accept-Language")).toBe("pt-BR");
  });
});

function wrapper(locale: Locale) {
  return function LocaleWrapper({ children }: { children: ReactNode }) {
    return <I18nProvider initialLocale={locale}>{children}</I18nProvider>;
  };
}

describe("formatting", () => {
  it("formats numbers and study time per language", () => {
    const en = renderHook(() => useFormat(), { wrapper: wrapper("en") }).result.current;
    const pt = renderHook(() => useFormat(), { wrapper: wrapper("pt-BR") }).result.current;
    expect(en.number(12345)).toBe("12,345");
    expect(pt.number(12345)).toBe("12.345");
    expect(en.duration(45)).toBe("45s");
    expect(en.duration(3900)).toBe("1h 5m");
    expect(pt.duration(3900)).toBe("1h 5min");
    expect(pt.duration(720)).toBe("12min");
  });

  it("dates follow the language", () => {
    const pt = renderHook(() => useFormat(), { wrapper: wrapper("pt-BR") }).result.current;
    expect(pt.date("2026-10-05T12:00:00Z", { month: "long", timeZone: "UTC" })).toBe("outubro");
  });
});

describe("validation messages", () => {
  it("translates form errors from @techrat/validation", () => {
    const parsed = registerSchema.safeParse({ email: "123", username: "a", password: "abc", displayName: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const pt = renderHook(() => useValidationTranslator(), { wrapper: wrapper("pt-BR") }).result.current;
    expect(fieldErrors(parsed.error, pt)).toMatchObject({
      email: "Informe um e-mail válido",
      username: "3 a 32 caracteres: letras, números ou sublinhado",
      password: "Pelo menos 8 caracteres",
    });
    // Without a translator the English messages are unchanged (mobile relies on this).
    expect(fieldErrors(parsed.error).email).toBe("Enter a valid email address");
  });
});

describe("useLocale", () => {
  it("exposes the active locale and a setter", () => {
    const { result } = renderHook(() => useLocale(), { wrapper: wrapper("en") });
    expect(result.current.locale).toBe("en");
    act(() => result.current.setLocale("pt-BR"));
    expect(result.current.locale).toBe("pt-BR");
  });
});
