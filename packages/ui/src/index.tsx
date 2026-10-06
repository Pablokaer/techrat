import type { ReactNode } from "react";
import { difficultyColors, tierColors } from "@techrat/theme";

// Small, dependency-free web primitives shared by the web and desktop apps (Tailwind classes).

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function ProgressBar({
  value,
  label,
  className,
  tone = "primary",
  size = "md",
}: {
  value: number;
  label?: string;
  className?: string;
  tone?: "primary" | "warning" | "error" | "muted";
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fill = { primary: "bg-primary", warning: "bg-warning", error: "bg-error", muted: "bg-text-secondary" }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cx("w-full overflow-hidden rounded-full bg-white/[0.06]", size === "sm" ? "h-1.5" : "h-2", className)}
    >
      <div className={cx("h-full rounded-full transition-[width] duration-500", fill, tone === "primary" && "shadow-glow-sm")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DifficultyBadge({ difficulty, label, className }: { difficulty: keyof typeof difficultyColors | string; label?: string; className?: string }) {
  const color = difficultyColors[difficulty as keyof typeof difficultyColors] ?? "#A7B0AA";
  return (
    <span
      className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}
      style={{ color, backgroundColor: `${color}1F`, border: `1px solid ${color}55` }}
    >
      {label ?? difficulty}
    </span>
  );
}

export function TierDot({ tier }: { tier: keyof typeof tierColors | string }) {
  const color = tierColors[tier as keyof typeof tierColors] ?? "#A7B0AA";
  return <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />;
}

export function XpPill({ xp, className }: { xp: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary", className)}>
      +{xp} XP
    </span>
  );
}

export function Card({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={cx("rounded-2xl border border-border bg-card", className)}>{children}</Tag>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-text-secondary">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
