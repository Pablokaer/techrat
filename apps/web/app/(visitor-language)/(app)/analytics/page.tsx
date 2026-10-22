"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, Flame, Gauge, Star, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Card, ProgressBar } from "@techrat/ui";
import { useAnalytics } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { AccuracyByDifficultyChart, ActivityChart } from "@/components/charts";
import { ErrorState, PageHeader, Skeleton, StatCard, Tabs } from "@/components/widgets";
import { useFormat, useT } from "@/i18n";

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const { data, isLoading, error } = useAnalytics(Number(days));
  const t = useT();
  const f = useFormat();

  return (
    <>
      <PageHeader eyebrow={t.analytics.eyebrow} title={t.analytics.title} subtitle={t.analytics.subtitle}
        actions={<Tabs label={t.analytics.periodLabel} value={days} onChange={setDays} items={[{ value: "7", label: t.analytics.periodDays(7) }, { value: "30", label: t.analytics.periodDays(30) }, { value: "90", label: t.analytics.periodDays(90) }]} />} />
      {isLoading && <Skeleton className="h-96" />}
      {error && <ErrorState error={error} />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={Target} value={`${Math.round(data.globalAccuracy)}%`} label={t.analytics.stats.accuracy(data.totalQuestions)} />
            <StatCard icon={Star} value={`+${f.number(data.xpEarnedInPeriod)}`} label={t.analytics.stats.xpInDays(data.days)} />
            <StatCard icon={Clock} value={f.duration(data.studySeconds)} label={t.analytics.stats.studyTime} />
            <StatCard icon={Flame} value={data.currentStreak} label={t.analytics.stats.streak(data.longestStreak)} tone="warning" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="font-semibold">{t.analytics.accuracyByDifficulty.title}</h2>
              <p className="text-sm text-text-secondary">{t.analytics.accuracyByDifficulty.subtitle}</p>
              <AccuracyByDifficultyChart data={data.byDifficulty} />
            </Card>
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{t.analytics.velocity.title}</h2>
                  <p className="text-sm text-text-secondary">{t.analytics.velocity.subtitle}</p>
                </div>
                <span className={data.velocityChangePercent >= 0 ? "flex items-center gap-1 font-mono text-primary" : "flex items-center gap-1 font-mono text-error"}>
                  {data.velocityChangePercent >= 0 ? <TrendingUp className="h-4 w-4" aria-hidden /> : <TrendingDown className="h-4 w-4" aria-hidden />}
                  {data.velocityChangePercent > 0 ? "+" : ""}{data.velocityChangePercent}%
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="rounded-xl bg-bg-2 p-4"><p className="font-mono text-2xl font-bold">{data.xpLast7Days}</p><p className="text-xs text-text-secondary">{t.analytics.velocity.last7}</p></div>
                <div className="rounded-xl bg-bg-2 p-4"><p className="font-mono text-2xl font-bold text-text-secondary">{data.xpPrevious7Days}</p><p className="text-xs text-text-secondary">{t.analytics.velocity.previous7}</p></div>
              </div>
              <h3 className="mt-5 text-sm font-semibold">{t.analytics.velocity.xpPerDay}</h3>
              <ActivityChart data={data.daily} dataKey="xpEarned" label={t.analytics.chartXp} />
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="font-semibold">{t.analytics.questionsPerDay}</h2>
            <ActivityChart data={data.daily} dataKey="questions" label={t.analytics.chartQuestions} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <StrengthList title={t.analytics.strongest.title} icon={TrendingUp} items={data.strongestTopics} empty={t.analytics.strongest.empty} />
            <StrengthList title={t.analytics.weakest.title} icon={Gauge} items={data.weakestTopics} empty={t.analytics.weakest.empty} practice />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">{t.analytics.byTopic}</h2>
              <ul className="space-y-3">
                {data.byTopic.length === 0 && <li className="text-sm text-text-secondary">{t.analytics.noAnswers}</li>}
                {data.byTopic.map((topic) => (
                  <li key={topic.slug} className="grid grid-cols-[1fr_120px_48px] items-center gap-3 text-sm">
                    <Link href={routes.topic(topic.slug)} className="truncate hover:text-primary">{topic.name}</Link>
                    <ProgressBar value={topic.accuracy} size="sm" tone={topic.accuracy >= 70 ? "primary" : topic.accuracy >= 50 ? "warning" : "error"} label={t.analytics.accuracyOf(topic.name)} />
                    <span className="text-right font-mono text-xs">{Math.round(topic.accuracy)}%</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">{t.analytics.bySubtopic}</h2>
              <ul className="max-h-96 space-y-3 overflow-auto pr-1">
                {data.bySubtopic.length === 0 && <li className="text-sm text-text-secondary">{t.analytics.noAnswers}</li>}
                {data.bySubtopic.map((s) => (
                  <li key={`${s.topicSlug}-${s.slug}`} className="grid grid-cols-[1fr_120px_72px] items-center gap-3 text-sm">
                    <Link href={routes.topic(s.topicSlug, s.slug)} className="truncate hover:text-primary">{s.name}</Link>
                    <ProgressBar value={s.accuracy} size="sm" tone={s.accuracy >= 70 ? "primary" : s.accuracy >= 50 ? "warning" : "error"} label={t.analytics.accuracyOf(s.name)} />
                    <span className="text-right font-mono text-xs">{s.correct}/{s.answered}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function StrengthList({ title, icon: Icon, items, empty, practice }: {
  title: string; icon: typeof TrendingUp; empty: string; practice?: boolean;
  items: { slug: string; name: string; accuracy: number; answered: number }[];
}) {
  const t = useT();
  return (
    <Card className="p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-primary" aria-hidden /> {title}</h2>
      {items.length === 0 ? <p className="text-sm text-text-secondary">{empty}</p> : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.slug} className="flex items-center justify-between rounded-xl bg-bg-2 px-4 py-3">
              <span><span className="block text-sm font-semibold">{item.name}</span><span className="text-xs text-text-secondary">{t.analytics.answered(item.answered)}</span></span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-sm">{Math.round(item.accuracy)}%</span>
                {practice && <Link href={routes.practice({ topic: item.slug, difficulty: "Easy" })} className="btn-secondary px-3 py-1.5 text-xs">{t.analytics.practice}</Link>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
