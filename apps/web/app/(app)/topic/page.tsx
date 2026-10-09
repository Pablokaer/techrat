"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Play } from "lucide-react";
import { Card, DifficultyBadge, ProgressBar, cx } from "@techrat/ui";
import { DIFFICULTIES } from "@techrat/types";
import { useTopic } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { useT } from "@/i18n";
import { TopicIcon } from "@/components/icons";
import { TopicLibrary } from "@/components/topic-library";
import { TopicQuestions } from "@/components/topic-questions";
import { ErrorState, PageHeader, Skeleton } from "@/components/widgets";

function TopicView() {
  const t = useT();
  const params = useSearchParams();
  const slug = params.get("slug") ?? "";
  const focus = params.get("subtopic");
  const { data, isLoading, error } = useTopic(slug);
  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <ErrorState error={error ?? new Error(t.learn.topic.notFound)} />;
  const { topic, progress, subtopicProgress, byDifficulty } = data;
  const counts = { Easy: topic.questions.easy, Medium: topic.questions.medium, Hard: topic.questions.hard, Expert: topic.questions.expert };

  return (
    <>
      <PageHeader
        eyebrow={topic.category}
        title={<span className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><TopicIcon name={topic.icon} className="h-6 w-6" /></span>{topic.name}</span>}
        subtitle={topic.description}
        actions={<Link href={routes.practice({ topic: topic.slug })} className="btn-primary"><Play className="h-4 w-4" /> {t.learn.topic.practice(topic.name)}</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">{t.learn.topic.topicLevel}</p>
          <p className="mt-3 text-3xl font-bold">{t.common.level(progress?.level.level ?? 1)}</p>
          <ProgressBar className="mt-3" value={progress?.level.progressPercent ?? 0} label={t.learn.topic.levelProgress} />
          <p className="mt-2 font-mono text-xs text-text-secondary">{t.learn.topic.toNextLevel(progress?.level.totalXp ?? 0, progress?.level.xpToNextLevel ?? 100)}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-text-muted">{t.learn.topic.answered}</dt><dd className="font-mono text-lg font-bold">{progress?.questionsAnswered ?? 0}</dd></div>
            <div><dt className="text-text-muted">{t.learn.topic.accuracy}</dt><dd className="font-mono text-lg font-bold">{Math.round(progress?.accuracy ?? 0)}%</dd></div>
          </dl>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <p className="eyebrow mb-4">{t.learn.topic.byDifficulty}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DIFFICULTIES.map((d) => {
              const b = byDifficulty.find((x) => x.difficulty === d);
              return (
                <Link key={d} href={routes.practice({ topic: topic.slug, difficulty: d })} className="rounded-xl border border-border bg-bg-2 p-4 card-hover">
                  <DifficultyBadge difficulty={d} label={t.common.difficulty[d] ?? d} />
                  <p className="mt-3 font-mono text-2xl font-bold">{b ? `${Math.round(b.accuracy)}%` : "—"}</p>
                  <p className="text-xs text-text-secondary">{t.learn.topic.answeredAvailable(b?.answered ?? 0, counts[d])}</p>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">{t.learn.topic.subtopics}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {subtopicProgress.map((s) => (
          <Link key={s.slug} href={routes.practice({ topic: topic.slug, subtopic: s.slug })}
            className={cx("rounded-2xl border bg-card p-4 card-hover", focus === s.slug ? "glow-border" : "border-border")}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{s.name}</p>
              <span className="font-mono text-xs text-text-secondary">{t.learn.questionsShort(s.questionCount)}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={s.answered === 0 ? 0 : s.accuracy} size="sm" tone={s.answered === 0 ? "muted" : s.accuracy >= 70 ? "primary" : s.accuracy >= 50 ? "warning" : "error"} label={t.learn.topic.accuracyLabel(s.name)} />
              <span className="shrink-0 font-mono text-xs text-text-secondary">{s.answered ? `${Math.round(s.accuracy)}%` : t.learn.topic.new}</span>
            </div>
          </Link>
        ))}
      </div>

      <TopicLibrary topic={topic.slug} topicName={topic.name} />

      <TopicQuestions topicSlug={topic.slug} subtopics={topic.subtopics.map((s) => ({ slug: s.slug, name: s.name }))} initialSubtopic={focus} />
    </>
  );
}

export default function TopicPage() {
  return <Suspense><TopicView /></Suspense>;
}
