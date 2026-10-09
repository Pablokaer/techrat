"use client";

import { ExternalLink } from "lucide-react";
import type { StudySource } from "@techrat/types";
import { Card, cx } from "@techrat/ui";
import { useModuleResources, useRoadmapResources } from "@/lib/queries";
import { useT } from "@/i18n";

const TYPE_TONE: Record<string, string> = {
  "official-docs": "border-primary/50 text-primary",
  spec: "border-primary/50 text-primary",
  book: "border-warning/50 text-warning",
  course: "border-expert/50 text-expert",
  video: "border-error/50 text-error",
  article: "border-border text-text-secondary",
};

/**
 * "Study resources": the recommended reading of a roadmap (general overview) or of one module (topics to master, each
 * with its sources). Renders nothing while a roadmap or module has no curated resources.
 */
export function StudyResources(props: { roadmap: string; module?: never } | { module: string; roadmap?: never }) {
  const t = useT().modules.resources;
  const roadmap = useRoadmapResources(props.roadmap ?? "");
  const moduleRes = useModuleResources(props.module ?? "");
  const sources = props.roadmap ? roadmap.data?.sources ?? [] : [];
  const topics = props.module ? moduleRes.data?.topics ?? [] : [];
  if (sources.length === 0 && topics.length === 0) return null;

  return (
    <section aria-labelledby={`resources-${props.roadmap ?? props.module}`} className="mt-8">
      <h2 id={`resources-${props.roadmap ?? props.module}`} className="text-lg font-bold">{t.heading}</h2>
      <p className="mt-1 text-sm text-text-secondary">{props.roadmap ? t.roadmapIntro : t.moduleIntro}</p>
      {sources.length > 0 && (
        <Card className="mt-3 p-2 sm:p-3"><SourceList sources={sources} /></Card>
      )}
      {topics.length > 0 && (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {topics.map((topic) => (
            <Card key={topic.key} as="div" className="p-4 sm:p-5">
              <div role="group" aria-labelledby={`topic-${topic.key}`}>
                <h3 id={`topic-${topic.key}`} className="font-semibold">{topic.name}</h3>
                <SourceList sources={topic.sources} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function SourceList({ sources }: { sources: StudySource[] }) {
  const t = useT().modules.resources;
  return (
    <ul className="mt-2 divide-y divide-border">
      {sources.map((s) => (
        <li key={s.url} className="py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a href={s.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-6 items-center gap-1.5 break-words text-sm font-semibold text-text hover:text-primary hover:underline">
              {s.title}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
              <span className="sr-only">{t.opensInNewTab}</span>
            </a>
            <span className={cx("rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none", TYPE_TONE[s.type] ?? TYPE_TONE.article)}>
              {t.type[s.type] ?? s.type}
            </span>
            <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-muted">{t.language[s.language] ?? s.language}</span>
          </div>
          {s.note && <p className="mt-1 text-xs text-text-secondary">{s.note}</p>}
        </li>
      ))}
    </ul>
  );
}
