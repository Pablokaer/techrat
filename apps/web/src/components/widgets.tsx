"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, Lock, type LucideIcon } from "lucide-react";
import { Card, ProgressBar, cx } from "@techrat/ui";
import type { RoadmapStep, TopicProgress } from "@techrat/types";
import { useT } from "@/i18n";
import { routes } from "@/lib/routes";
import { TopicIcon } from "./icons";

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: ReactNode; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-text-secondary">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SectionHeader({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  const t = useT();
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {cta ?? t.widgets.viewAll} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function StatCard({ icon: Icon, value, label, tone = "primary", href }: { icon: LucideIcon; value: ReactNode; label: string; tone?: "primary" | "warning"; href?: string }) {
  const inner = (
    <Card as="div" className={cx("flex items-center gap-3 p-3.5 sm:gap-4 sm:p-5", href && "card-hover")}>
      <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12", tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary")}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-xl font-bold sm:text-2xl">{value}</p>
        <p className="text-xs leading-tight text-text-secondary sm:text-sm">{label}</p>
      </div>
      {href && <ChevronRight className="ml-auto hidden h-5 w-5 shrink-0 text-text-muted sm:block" aria-hidden />}
    </Card>
  );
  return href ? <Link href={href} className="block rounded-2xl">{inner}</Link> : inner;
}

export function TopicCard({ topic, emphasise = false }: { topic: TopicProgress; emphasise?: boolean }) {
  const t = useT();
  return (
    <Link href={routes.topic(topic.topicSlug)} className={cx("group block rounded-2xl border bg-card p-5 card-hover", emphasise ? "glow-border" : "border-border")}>
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><TopicIcon name={topic.icon} className="h-6 w-6" /></span>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-text-secondary">{t.widgets.levelShort(topic.level.level)}</span>
      </div>
      <h3 className="mt-4 font-semibold">{topic.topicName}</h3>
      <p className="mt-0.5 text-xs text-text-muted">{topic.category}</p>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={topic.completionPercent} label={t.widgets.completion(topic.topicName)} size="sm" />
        <span className="font-mono text-xs text-text-secondary">{Math.round(topic.completionPercent)}%</span>
      </div>
    </Link>
  );
}

export function RoadmapChain({ steps, roadmapSlug }: { steps: RoadmapStep[]; roadmapSlug: string }) {
  const t = useT();
  return (
    <ol className="flex gap-3 overflow-x-auto pb-2">
      {steps.map((s, i) => {
        const done = s.status === "Completed";
        const current = s.status === "Current";
        return (
          <li key={s.id} className="flex shrink-0 items-center gap-3">
            <Link
              href={routes.roadmap(roadmapSlug)}
              className={cx(
                "flex min-w-48 items-center gap-3 rounded-2xl border px-4 py-3",
                done && "border-primary/60 bg-primary/5",
                current && "glow-border bg-primary/10",
                !done && !current && "border-border bg-card text-text-secondary",
              )}
            >
              <span className={cx("flex h-9 w-9 items-center justify-center rounded-full", done ? "bg-primary text-on-primary" : current ? "border-2 border-primary text-primary" : "bg-white/5")}>
                {done ? <Check className="h-5 w-5" aria-hidden /> : current ? <span className="h-3 w-3 rounded-full bg-primary shadow-glow-sm" /> : <Lock className="h-4 w-4" aria-hidden />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-text">{s.title}</span>
                <span className="block text-xs">{done ? t.widgets.stepStatus.completed : current ? t.widgets.stepStatus.inProgress : t.widgets.stepStatus.locked}</span>
              </span>
            </Link>
            {i < steps.length - 1 && <span aria-hidden className="h-px w-6 border-t border-dashed border-border" />}
          </li>
        );
      })}
    </ol>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm text-text-secondary">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const t = useT();
  return (
    <Card className="px-6 py-10 text-center">
      <p className="font-semibold text-error">{t.common.somethingWentWrong}</p>
      <p className="mt-1 text-sm text-text-secondary">{error instanceof Error ? error.message : t.widgets.pleaseTryAgain}</p>
      {retry && <button className="btn-secondary mt-4" onClick={retry}>{t.widgets.retry}</button>}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-2xl bg-white/[0.04]", className)} />;
}

export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            "shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
            value === it.value ? "glow-border bg-primary/10 text-text" : "border-border bg-card text-text-secondary hover:text-text",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
