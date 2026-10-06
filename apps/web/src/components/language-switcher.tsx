"use client";

import { Languages } from "lucide-react";
import { cx } from "@techrat/ui";
import { LOCALES, LOCALE_LABELS, useLocale, useT } from "@/i18n";

/** Two-option language toggle (EN / PT). `compact` shows only the short codes (and drops the icon on phones). */
export function LanguageSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  return (
    <div role="group" aria-label={t.common.language.choose} className={cx("inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1", className)}>
      <Languages className={cx("ml-1 h-4 w-4 text-text-muted", compact && "hidden sm:block")} aria-hidden />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => setLocale(l)}
          aria-pressed={l === locale}
          title={LOCALE_LABELS[l].name}
          className={cx(
            "rounded-lg px-2 py-1 font-mono text-xs font-semibold transition-colors",
            l === locale ? "bg-primary/15 text-primary" : "text-text-secondary hover:text-text",
          )}
        >
          {compact ? LOCALE_LABELS[l].short : LOCALE_LABELS[l].name}
        </button>
      ))}
    </div>
  );
}
