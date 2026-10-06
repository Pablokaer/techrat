"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Check, Clock, Lock, Play, Trophy } from "lucide-react";
import { Card, DifficultyBadge, ProgressBar, cx } from "@techrat/ui";
import { isApiError } from "@techrat/api";
import { useRoadmap, useStartPractice, useStartRoadmap } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { TopicIcon } from "@/components/icons";
import { ErrorState, PageHeader, Skeleton } from "@/components/widgets";
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
      await startRoadmap.mutateAsync();
      toast({ kind: "success", title: t.roadmaps.detail.started(summary.name) });
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

      <ol className="mt-8 space-y-6">
        {modules.map((m) => (
          <li key={m.id}>
            <div className="mb-3 flex items-center gap-3">
              <span className={cx("flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold", m.isCompleted ? "bg-primary text-on-primary" : "border border-border text-text-secondary")}>
                {m.isCompleted ? <Check className="h-4 w-4" aria-hidden /> : m.order}
              </span>
              <h2 className="text-lg font-bold">{m.title}</h2>
              <span className="ml-auto font-mono text-xs text-text-muted">{t.roadmaps.detail.moduleXp(m.xpReward)}</span>
            </div>
            <div className="space-y-2 border-l border-dashed border-border pl-5 sm:ml-4">
              {m.steps.map((s) => {
                const current = s.status === "Current" && started;
                const done = s.status === "Completed";
                return (
                  <Card key={s.id} as="div" className={cx("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", current && "glow-border", !done && !current && "opacity-75")}>
                    <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", done ? "bg-primary text-on-primary" : current ? "border-2 border-primary" : "bg-white/5 text-text-muted")}>
                      {done ? <Check className="h-5 w-5" aria-hidden /> : current ? <span className="h-3 w-3 rounded-full bg-primary" /> : <Lock className="h-4 w-4" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.order}. {s.title}</p>
                      <p className="text-xs text-text-secondary">{s.topicName}{s.subtopicName ? ` › ${s.subtopicName}` : ""} · {t.roadmaps.detail.stepMeta(s.estimatedMinutes, s.minimumQuestions, s.minimumAccuracy)}</p>
                      {current && s.criteria && (
                        <div className="mt-2 flex items-center gap-3">
                          <ProgressBar size="sm" className="max-w-xs" value={(Math.min(s.criteria.answeredQuestions, s.minimumQuestions) / s.minimumQuestions) * 100} label={t.roadmaps.detail.stepProgress} />
                          <span className="text-xs text-text-secondary">{t.roadmaps.detail.stepCriteria(s.criteria.answeredQuestions, s.minimumQuestions, Math.round(s.criteria.accuracy))}</span>
                        </div>
                      )}
                    </div>
                    <DifficultyBadge difficulty={s.difficulty} label={t.common.difficulty[s.difficulty] ?? s.difficulty} />
                    <span className="font-mono text-xs text-primary">{t.common.plusXp(s.xpReward)}</span>
                    {current && <button onClick={() => practiceStep(s.id)} disabled={startPractice.isPending} className="btn-primary">{t.roadmaps.detail.practiceStep}</button>}
                    {done && <span className="text-xs font-semibold text-primary">{t.roadmaps.stepStatus.Completed}</span>}
                  </Card>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function RoadmapPage() {
  return <Suspense><RoadmapView /></Suspense>;
}
