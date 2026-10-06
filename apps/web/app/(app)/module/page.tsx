"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, Clock, Map as MapIcon, Trophy } from "lucide-react";
import { Card, ProgressBar } from "@techrat/ui";
import { isApiError } from "@techrat/api";
import { useModule, useStartPractice } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { TopicIcon } from "@/components/icons";
import { ModuleKindBadge, ModuleStatus, StepCard } from "@/components/modules";
import { ErrorState, PageHeader, Skeleton } from "@/components/widgets";
import { useToast } from "@/components/providers";
import { useT } from "@/i18n";

/** A reusable module on its own (`/module?slug=`): its steps count in every roadmap listed under "Used in". */
function ModuleView() {
  const t = useT();
  const slug = useSearchParams().get("slug") ?? "";
  const { data, isLoading, error } = useModule(slug);
  const startPractice = useStartPractice();
  const router = useRouter();
  const toast = useToast();

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <ErrorState error={error ?? new Error(t.modules.page.notFound)} />;
  const { summary, steps, requires } = data;
  const progress = summary.progress;
  const completedSteps = progress?.completedSteps ?? 0;
  const percent = summary.stepsCount ? (completedSteps / summary.stepsCount) * 100 : 0;
  const status = progress?.isCompleted ? "Completed" : progress?.isStarted ? "Current" : null;

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
        eyebrow={`${t.modules.page.eyebrow} · ${summary.category} · ${t.common.roadmapDifficulty[summary.level] ?? summary.level}`}
        title={<span className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><TopicIcon name={summary.icon} className="h-6 w-6" /></span>{summary.name}</span>}
        subtitle={summary.description}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ModuleKindBadge kind={summary.kind} />
        {status && <ModuleStatus status={status} />}
        <span className="text-xs text-text-muted">{t.modules.page.version(summary.version)}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 md:col-span-2">
          <p className="eyebrow">{t.modules.page.progress}</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="font-mono text-3xl font-bold">{Math.round(percent)}%</p>
            <p className="text-sm text-text-secondary">{t.modules.page.stepsOf(completedSteps, summary.stepsCount)}</p>
          </div>
          <ProgressBar className="mt-3" value={percent} label={t.modules.page.progressLabel} />
        </Card>
        <Card className="flex items-center gap-3 p-5"><Clock className="h-6 w-6 text-primary" aria-hidden /><div><p className="font-mono text-xl font-bold">{t.modules.page.minutes(summary.estimatedMinutes)}</p><p className="text-xs text-text-secondary">{t.roadmaps.detail.estimatedTime}</p></div></Card>
        <Card className="flex items-center gap-3 p-5"><Trophy className="h-6 w-6 text-warning" aria-hidden /><div><p className="font-mono text-xl font-bold">{t.modules.page.xp(summary.xpReward)}</p><p className="text-xs text-text-secondary">{t.roadmaps.detail.xpOnCompletion}</p></div></Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="font-semibold">{t.modules.page.usedIn}</p>
          {summary.usedInRoadmaps.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-text-secondary">{t.modules.page.usedInHint}</p>
              <ul className="mt-3 space-y-2">
                {summary.usedInRoadmaps.map((r) => (
                  <li key={r.slug}>
                    <Link href={routes.roadmap(r.slug)} className="flex items-center gap-3 rounded-xl border border-border bg-bg-2 px-4 py-3 text-sm font-semibold card-hover">
                      <MapIcon className="h-4 w-4 text-text-muted" aria-hidden />
                      <span className="flex-1">{r.name}</span>
                      <ArrowRight className="h-4 w-4 text-text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">{t.modules.page.usedInEmpty}</p>
          )}
        </Card>
        {requires.length > 0 && (
          <Card className="p-5">
            <p className="font-semibold">{t.modules.page.requires}</p>
            <p className="mt-1 text-xs text-text-secondary">{t.modules.page.requiresHint}</p>
            <ul className="mt-3 space-y-2">
              {requires.map((m) => (
                <li key={m.slug}>
                  <Link href={routes.module(m.slug)} className="flex items-center gap-3 rounded-xl border border-border bg-bg-2 px-4 py-3 text-sm font-semibold card-hover">
                    <span className="flex-1">{m.name}</span>
                    <ArrowRight className="h-4 w-4 text-text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">{t.modules.page.steps} <span className="text-sm font-normal text-text-muted">· {t.modules.page.stepsCount(steps.length)}</span></h2>
      <div className="space-y-2">
        {steps.map((s) => (
          <StepCard key={s.id} step={s} active={s.status === "Current"} onPractice={practiceStep} practicing={startPractice.isPending} />
        ))}
      </div>
    </>
  );
}

export default function ModulePage() {
  return <Suspense><ModuleView /></Suspense>;
}
