"use client";

import { useMemo } from "react";
import type { ValidationMessageKey } from "@techrat/validation";
import { useLocale, useT } from "./provider";

/** Locale-aware number and date formatting: `const f = useFormat(); f.number(1234)`. */
export function useFormat() {
  const { locale } = useLocale();
  return useMemo(() => {
    const nf = new Intl.NumberFormat(locale);
    const minute = locale === "pt-BR" ? "min" : "m";
    return {
      /** Compact study time: "45s", "12m" / "12min", "1h 5m" / "1h 5min". */
      duration: (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        if (m < 60) return `${m}${minute}`;
        return `${Math.floor(m / 60)}h ${m % 60}${minute}`;
      },
      number: (n: number) => nf.format(n),
      date: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleDateString(locale, options),
      dateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleString(locale, options),
    };
  }, [locale]);
}

/** Translator for `fieldErrors(error, translate)` from @techrat/validation. */
export function useValidationTranslator() {
  const t = useT();
  return useMemo(() => (key: ValidationMessageKey | null) => (key ? t.validation[key] : t.validation.invalid), [t]);
}
