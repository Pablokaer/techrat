"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, Clock, Lock, Map as MapIcon } from "lucide-react";
import { Card, ProgressBar, cx } from "@techrat/ui";
import { useRoadmaps } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { useT } from "@/i18n";
import { TopicIcon } from "@/components/icons";
import { PageHeader, Skeleton, Tabs } from "@/components/widgets";

const DIFF_TONE: Record<string, string> = { Beginner: "text-primary-2", Intermediate: "text-warning", Advanced: "text-error", Expert: "text-expert" };
const ALL = "all";

export default function RoadmapsPage() {
  const t = useT();
  const { data, isLoading } = useRoadmaps();
  const [category, setCategory] = useState(ALL);
  const categories = useMemo(() => [...new Set(data?.map((r) => r.category) ?? [])], [data]);
  const visible = (data ?? []).filter((r) => category === ALL || r.category === category);
  const started = visible.filter((r) => r.progress?.isStarted);
  const rest = visible.filter((r) => !r.progress?.isStarted);

  return (
    <>
      <Card className="matrix-bg mb-6 p-6 sm:p-8">
        <p className="eyebrow">{t.roadmaps.list.breadcrumb}</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{t.roadmaps.list.titleBefore}<span className="text-primary">{t.roadmaps.list.titleAccent}</span>{t.roadmaps.list.titleAfter}</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">{t.roadmaps.list.subtitle}</p>
      </Card>
      <Tabs
        label={t.roadmaps.list.categoriesLabel}
        value={category}
        onChange={setCategory}
        items={[{ value: ALL, label: t.roadmaps.list.allPaths }, ...categories.map((c) => ({ value: c, label: c }))]}
      />

      {isLoading && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-60" />)}</div>}
      {started.length > 0 && <h2 className="mb-3 mt-8 text-lg font-bold">{t.roadmaps.list.inProgress}</h2>}
      <Grid items={started} />
      {rest.length > 0 && <h2 className="mb-3 mt-8 text-lg font-bold">{started.length ? t.roadmaps.list.exploreMore : t.roadmaps.list.allRoadmaps}</h2>}
      <Grid items={rest} />
    </>
  );
}

function Grid({ items }: { items: NonNullable<ReturnType<typeof useRoadmaps>["data"]> }) {
  const t = useT();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((r) => {
        const locked = r.progress && !r.progress.isUnlocked;
        return (
          <Card key={r.slug} as="article" className={cx("flex flex-col p-5", locked && "opacity-80")}>
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><TopicIcon name={r.icon} className="h-6 w-6" /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-muted">{r.category}</p>
                <h3 className="font-semibold leading-snug">{r.name}</h3>
              </div>
              {locked && <Lock className="ml-auto h-4 w-4 shrink-0 text-text-muted" aria-label={t.roadmaps.list.locked} />}
            </div>
            <p className="mt-3 line-clamp-2 flex-1 text-sm text-text-secondary">{r.description}</p>
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar value={r.progress?.percentComplete ?? 0} size="sm" label={t.roadmaps.list.progressLabel(r.name)} />
              <span className="font-mono text-xs text-text-secondary">{Math.round(r.progress?.percentComplete ?? 0)}%</span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5"><MapIcon className="h-4 w-4 text-text-muted" aria-hidden /><dd>{t.roadmaps.list.steps(r.progress?.completedSteps ?? 0, r.stepsCount)}</dd></div>
              <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-text-muted" aria-hidden /><dd>{t.roadmaps.list.hours(r.estimatedHours)}</dd></div>
              <div className="flex items-center gap-1.5"><BarChart3 className={cx("h-4 w-4", DIFF_TONE[r.difficulty])} aria-hidden /><dd>{t.common.roadmapDifficulty[r.difficulty] ?? r.difficulty}</dd></div>
            </dl>
            <Link href={routes.roadmap(r.slug)} className={cx("mt-5 w-full", locked ? "btn-secondary" : "btn-primary")}>
              {locked ? t.roadmaps.list.viewPrerequisites : r.progress?.isStarted ? t.roadmaps.list.continuePath : t.roadmaps.list.viewPath} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
