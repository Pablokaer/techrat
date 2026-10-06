"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProgressBar, cx } from "@techrat/ui";
import { api, unwrap } from "@/lib/api";
import { useTopics } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { useT } from "@/i18n";
import { TopicIcon } from "@/components/icons";
import { PageHeader, Skeleton, Tabs } from "@/components/widgets";

const ALL = "all";

export default function LearnPage() {
  const t = useT();
  const { data: topics, isLoading } = useTopics();
  const { data: progress } = useQuery({ queryKey: ["topic-progress"], queryFn: () => unwrap(api.GET("/api/v1/users/me/topic-progress")) });
  const [category, setCategory] = useState(ALL);

  const categories = useMemo(() => [...new Set(topics?.map((topic) => topic.category) ?? [])], [topics]);
  const visible = topics?.filter((topic) => category === ALL || topic.category === category) ?? [];
  const bySlug = new Map(progress?.map((p) => [p.topicSlug, p]));

  return (
    <>
      <PageHeader eyebrow={t.learn.eyebrow} title={t.learn.title} subtitle={t.learn.subtitle(topics?.length ?? 33)} />
      <Tabs
        label={t.learn.categoriesLabel}
        value={category}
        onChange={setCategory}
        items={[{ value: ALL, label: t.learn.allCategories }, ...categories.map((c) => ({ value: c, label: c }))]}
      />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-44" />)}
        {visible.map((topic) => {
          const p = bySlug.get(topic.slug);
          const total = topic.questions.easy + topic.questions.medium + topic.questions.hard + topic.questions.expert;
          return (
            <Link key={topic.slug} href={routes.topic(topic.slug)} className={cx("rounded-2xl border bg-card p-5 card-hover", p ? "border-primary/30" : "border-border")}>
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><TopicIcon name={topic.icon} className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate font-semibold">{topic.name}</h2>
                    {p && <span className="shrink-0 rounded-full border border-primary/40 px-2 py-0.5 font-mono text-[11px] text-primary">{t.learn.levelShort(p.level.level)}</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{topic.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ProgressBar value={p?.completionPercent ?? 0} size="sm" label={t.learn.completionLabel(topic.name)} tone={p ? "primary" : "muted"} />
                <span className="shrink-0 font-mono text-xs text-text-secondary">{p ? `${p.distinctAnswered}/${total}` : t.learn.questionsShort(total)}</span>
              </div>
              <p className="mt-2 text-xs text-text-muted">{t.learn.subtopicsCount(topic.subtopics.length)} · {topic.category}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
