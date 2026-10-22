"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Check, Clock, Lock, Play, Trophy } from "lucide-react";
import { Card, ProgressBar, cx } from "@techrat/ui";
import { isApiError } from "@techrat/api";
import { useRoadmap, useStartPractice, useStartRoadmap } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { TopicIcon } from "@/components/icons";
import { ErrorState, PageHeader, Skeleton } from "@/components/widgets";
import { StudyResources } from "@/components/study-resources";
import { ModuleKindBadge, ModuleStatus, OptionalTag, SharedBadge, StepCard } from "@/components/modules";
import { useToast } from "@/components/providers";
import { useT } from "@/i18n";

function RoadmapView() {
  const t = useT();
  const slug = useSearchParams().get("slug") ?? "";
  const { data, isLoading, error } = useRoadmap(slug);
  const startRoadmap = useStartRoadmap(slug);
  const startPractice = useStartPractice();
  const router = useRouter();
  const toast = useToast();

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <ErrorState error={error ?? new Error(t.roadmaps.detail.notFound)} />;
  const { summary, prerequisites, modules } = data;
  const state = summary.progress;
  const started = !!state?.isStarted;

  async function enrol() {
    try {
      const enrolled = await startRoadmap.mutateAsync();
      // Modules finished in other roadmaps count here too; tell the learner how much was credited.
      const credit = enrolled.summary.progress;
      const body = credit && (credit.alreadyCompletedModules > 0 || credit.alreadyCompletedSteps > 0)
        ? t.roadmaps.detail.credited(credit.alreadyCompletedModules, credit.alreadyCompletedSteps)
        : undefined;
      toast({ kind: "success", title: t.roadmaps.detail.started(summary.name), body });
    } catch (e) {
      toast({ kind: "error", title: isApiError(e) ? e.detail ?? e.title : t.roadmaps.detail.startError });
    }
  }

  async function practiceStep(stepId: string) {
    try {
      const s = await startPractice.mutateAsync({ mode: "Roadmap", roadmapStepId: stepId, count: 10 });
      router.push(routes.session(s.id));
    } catch (e) {
      toast({ kind: "error", title: isApiError(e) ? e.detail ?? e.title : t.roadmaps.detail.practiceError });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`${summary.category} · ${t.common.roadmapDifficulty[summary.difficulty] ?? summary.difficulty}`}
        title={<span className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><TopicIcon name={summary.icon} className="h-6 w-6" /></span>{summary.name}</span>}
        subtitle={summary.description}
        actions={!started && (
          <button onClick={enrol} disabled={startRoadmap.isPending || state?.isUnlocked === false} className="btn-primary">
            {state?.isUnlocked === false ? <><Lock className="h-4 w-4" /> {t.roadmaps.detail.locked}</> : <><Play className="h-4 w-4" /> {t.roadmaps.detail.start}</>}
          </button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 md:col-span-2">
          <p className="eyebrow">{t.roadmaps.detail.progress}</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="font-mono text-3xl font-bold">{Math.round(state?.percentComplete ?? 0)}%</p>
            <p className="text-sm text-text-secondary">{t.roadmaps.detail.stepsOf(state?.completedSteps ?? 0, summary.stepsCount)}</p>
          </div>
          <ProgressBar className="mt-3" value={state?.percentComplete ?? 0} label={t.roadmaps.detail.progressLabel} />
        </Card>
        <Card className="flex items-center gap-3 p-5"><Clock className="h-6 w-6 text-primary" aria-hidden /><div><p className="font-mono text-xl font-bold">{t.roadmaps.list.hours(summary.estimatedHours)}</p><p className="text-xs text-text-secondary">{t.roadmaps.detail.estimatedTime}</p></div></Card>
        <Card className="flex items-center gap-3 p-5"><Trophy className="h-6 w-6 text-warning" aria-hidden /><div><p className="font-mono text-xl font-bold">+{summary.xpReward}</p><p className="text-xs text-text-secondary">{t.roadmaps.detail.xpOnCompletion}</p></div></Card>
      </div>

      {prerequisites.length > 0 && (
        <Card className="mt-4 p-5">
          <p className="font-semibold">{t.roadmaps.detail.prerequisites}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {prerequisites.map((p) => (
              <li key={p.slug}>
                <Link href={routes.roadmap(p.slug)} className="flex items-center gap-3 rounded-xl border border-border bg-bg-2 px-4 py-3 card-hover">
                  {p.isMet ? <Check className="h-5 w-5 text-primary" aria-label={t.roadmaps.detail.met} /> : <Lock className="h-5 w-5 text-text-muted" aria-label={t.roadmaps.detail.notMet} />}
                  <span className="flex-1 text-sm"><span className="font-semibold">{p.name}</span> <span className="text-text-secondary">{t.roadmaps.detail.prereqPercent(Math.round(p.currentPercent), p.minimumPercent)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <StudyResources roadmap={summary.slug} />

      <ol className="mt-8 space-y-6">
        {modules.map((m) => {
          const headingId = `module-${m.id}`;
          const capstone = m.kind === "Capstone";
          const otherRoadmaps = m.usedInRoadmaps.filter((r) => r.slug !== summary.slug);
          return (
            <li key={m.id} aria-labelledby={headingId} className={cx(capstone && "rounded-2xl border border-primary/40 p-4")}>
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold", m.isCompleted ? "bg-primary text-on-primary" : "border border-border text-text-secondary")}>
                  {m.isCompleted ? <Check className="h-4 w-4" aria-hidden /> : m.order}
                </span>
                <h2 id={headingId} className="text-lg font-bold"><Link href={routes.module(m.moduleSlug)} className="hover:underline">{m.title}</Link></h2>
                <ModuleKindBadge kind={m.kind} />
                {!m.isRequired && <OptionalTag />}
                {otherRoadmaps.length > 0 && <SharedBadge />}
                <ModuleStatus status={m.status} completedElsewhere={m.completedElsewhere} />
                <span className="ml-auto font-mono text-xs text-text-muted">{t.roadmaps.detail.moduleXp(m.xpReward)}</span>
              </div>
              {(m.description || otherRoadmaps.length > 0) && (
                <div className="mb-3 space-y-1 text-sm text-text-secondary sm:ml-11">
                  {m.description && <p>{m.description}</p>}
                  {otherRoadmaps.length > 0 && (
                    <p className="text-xs">
                      {t.modules.alsoIn}{" "}
                      {otherRoadmaps.map((r, i) => (
                        <span key={r.slug}>{i > 0 && ", "}<Link href={routes.roadmap(r.slug)} className="font-semibold text-text hover:underline">{r.name}</Link></span>
                      ))}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2 border-l border-dashed border-border pl-5 sm:ml-4">
                {m.steps.map((s) => (
                  <StepCard key={s.id} step={s} active={s.status === "Current" && started} onPractice={practiceStep} practicing={startPractice.isPending} />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default function RoadmapPage() {
  return <Suspense><RoadmapView /></Suspense>;
}
