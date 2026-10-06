"use client";

import { Check, CheckCheck, CircleDot, Flag, Layers, Lock, ShieldCheck, Share2, Sparkles, type LucideIcon } from "lucide-react";
import { Card, DifficultyBadge, ProgressBar, cx } from "@techrat/ui";
import type { RoadmapStep } from "@techrat/types";
import { useT } from "@/i18n";

const chip = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold";

const KIND_ICONS: Record<string, LucideIcon> = { Core: Layers, Context: Layers, BestPractices: ShieldCheck, Capstone: Flag };

/** Module kind (Core, Context, Best practices, Capstone). The capstone is the roadmap's final challenge, so it stands out. */
export function ModuleKindBadge({ kind }: { kind: string }) {
  const t = useT();
  const Icon = KIND_ICONS[kind] ?? Layers;
  const label = t.modules.kind[kind] ?? kind;
  if (kind === "Capstone")
    return (
      <span className={cx(chip, "border-primary/60 text-primary")}>
        <Flag className="h-3 w-3" aria-hidden />
        <span>{label}</span>
        <span aria-hidden>·</span>
        <span>{t.modules.capstoneHint}</span>
      </span>
    );
  return <span className={cx(chip, "border-border text-text-secondary")}><Icon className="h-3 w-3" aria-hidden /><span>{label}</span></span>;
}

export function OptionalTag() {
  const t = useT();
  return <span className={cx(chip, "border-dashed border-border text-text-secondary")} title={t.modules.optionalHint}>{t.modules.optional}</span>;
}

export function SharedBadge() {
  const t = useT();
  return <span className={cx(chip, "border-border text-text")} title={t.modules.sharedHint}><Share2 className="h-3 w-3" aria-hidden />{t.modules.shared}</span>;
}

export function NewBadge() {
  const t = useT();
  return <span className={cx(chip, "border-primary/50 text-primary")} title={t.modules.newStepHint}><Sparkles className="h-3 w-3" aria-hidden />{t.modules.newStep}</span>;
}

const STATUS_ICONS: Record<string, LucideIcon> = { Completed: Check, Current: CircleDot, Locked: Lock };

/**
 * Module status as icon + text (never color only). "Completed in another roadmap" replaces the plain status
 * when the learner earned the module elsewhere — it counts here too.
 */
export function ModuleStatus({ status, completedElsewhere = false }: { status: string; completedElsewhere?: boolean }) {
  const t = useT();
  const Icon = completedElsewhere ? CheckCheck : STATUS_ICONS[status] ?? Lock;
  const label = completedElsewhere ? t.modules.completedElsewhere : t.modules.status[status] ?? status;
  const done = completedElsewhere || status === "Completed";
  return (
    <span data-module-status={completedElsewhere ? "completed-elsewhere" : status} className={cx("inline-flex items-center gap-1 text-xs font-semibold", done ? "text-primary" : "text-text-secondary")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

/** One step of a module, shared by the roadmap and module pages. `active` = current step the learner can practice now. */
export function StepCard({ step: s, active, onPractice, practicing }: { step: RoadmapStep; active: boolean; onPractice: (stepId: string) => void; practicing: boolean }) {
  const t = useT();
  const done = s.status === "Completed";
  return (
    <Card as="div" className={cx("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", active && "glow-border", !done && !active && "opacity-75")}>
      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", done ? "bg-primary text-on-primary" : active ? "border-2 border-primary" : "bg-white/5 text-text-muted")}>
        {done ? <Check className="h-5 w-5" aria-hidden /> : active ? <span className="h-3 w-3 rounded-full bg-primary" /> : <Lock className="h-4 w-4" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold"><span>{s.order}. {s.title}</span>{s.isNew && <NewBadge />}</p>
        <p className="text-xs text-text-secondary">{s.topicName}{s.subtopicName ? ` › ${s.subtopicName}` : ""} · {t.roadmaps.detail.stepMeta(s.estimatedMinutes, s.minimumQuestions, s.minimumAccuracy)}</p>
        {active && s.criteria && (
          <div className="mt-2 flex items-center gap-3">
            <ProgressBar size="sm" className="max-w-xs" value={(Math.min(s.criteria.answeredQuestions, s.minimumQuestions) / s.minimumQuestions) * 100} label={t.roadmaps.detail.stepProgress} />
            <span className="text-xs text-text-secondary">{t.roadmaps.detail.stepCriteria(s.criteria.answeredQuestions, s.minimumQuestions, Math.round(s.criteria.accuracy))}</span>
          </div>
        )}
      </div>
      <DifficultyBadge difficulty={s.difficulty} label={t.common.difficulty[s.difficulty] ?? s.difficulty} />
      <span className="font-mono text-xs text-primary">{t.common.plusXp(s.xpReward)}</span>
      {active && <button onClick={() => onPractice(s.id)} disabled={practicing} className="btn-primary">{t.roadmaps.detail.practiceStep}</button>}
      {done && <span className="text-xs font-semibold text-primary">{t.roadmaps.stepStatus.Completed}</span>}
    </Card>
  );
}
