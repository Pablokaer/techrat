"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { CitedReference, TopicLibraryModule } from "@techrat/types";
import { Card } from "@techrat/ui";
import { useTopicResources } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { useT } from "@/i18n";
import { SourceList } from "@/components/study-resources";

/**
 * "Study library" card of a topic (Learn): everything to read about it in one place. The curated reading of each
 * module that teaches the topic comes first (collapsed except the first, since a topic can have dozens of links), then
 * the official pages its questions cite, grouped by subtopic. Renders nothing while the topic has neither.
 */
export function TopicLibrary({ topic, topicName }: { topic: string; topicName: string }) {
  const t = useT();
  const l = t.learn.topic.library;
  const { data } = useTopicResources(topic);
  if (!data || (data.modules.length === 0 && data.cited.length === 0)) return null;

  return (
    <section aria-labelledby={`library-${topic}`} className="mt-8">
      <Card className="p-4 sm:p-6">
        <h2 id={`library-${topic}`} className="text-lg font-bold">{l.heading}</h2>
        <p className="mt-1 text-sm text-text-secondary">{l.intro(topicName, data.totalLinks, data.modules.length)}</p>

        {data.modules.length > 0 && (
          <div className="mt-5">
            <h3 className="font-semibold">{l.curatedHeading}</h3>
            <p className="mt-0.5 text-sm text-text-secondary">{l.curatedIntro}</p>
            <div className="mt-3 space-y-3">
              {data.modules.map((m, i) => <ModuleReading key={m.slug} module={m} open={i === 0} />)}
            </div>
          </div>
        )}

        {data.cited.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold">{l.citedHeading}</h3>
            <p className="mt-0.5 text-sm text-text-secondary">{l.citedIntro}</p>
            <div className="mt-3 space-y-3">
              {data.cited.map((s) => (
                <details key={s.slug} aria-labelledby={`cited-${topic}-${s.slug}`} className="group rounded-xl border border-border bg-bg-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3">
                    <span id={`cited-${topic}-${s.slug}`} className="font-semibold">{s.name}</span>
                    <span className="flex items-center gap-2 font-mono text-xs text-text-secondary">
                      {s.references.length}
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                    </span>
                  </summary>
                  <ul className="divide-y divide-border px-4 pb-2">
                    {s.references.map((r) => <CitedItem key={r.url} reference={r} />)}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

function ModuleReading({ module, open }: { module: TopicLibraryModule; open: boolean }) {
  const l = useT().learn.topic.library;
  const id = `library-module-${module.slug}`;
  return (
    <details open={open} aria-labelledby={id} className="group rounded-xl border border-border bg-bg-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3">
        <span id={id} className="font-semibold">{module.name}</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-4 px-4 pb-4 md:grid-cols-2">
        {module.topics.map((topic) => (
          <div key={topic.key} role="group" aria-labelledby={`${id}-${topic.key}`}>
            <h4 id={`${id}-${topic.key}`} className="text-sm font-semibold">{topic.name}</h4>
            <SourceList sources={topic.sources} />
          </div>
        ))}
      </div>
      <p className="px-4 pb-3 text-sm">
        <Link href={routes.module(module.slug)} className="font-semibold text-primary hover:underline">
          {l.openModule}<span className="sr-only">: {module.name}</span>
        </Link>
      </p>
    </details>
  );
}

function CitedItem({ reference }: { reference: CitedReference }) {
  const t = useT();
  const l = t.learn.topic.library;
  return (
    <li className="py-2.5">
      <a href={reference.url} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-6 items-center gap-1.5 break-all text-sm font-semibold text-text hover:text-primary hover:underline">
        {reference.url.replace(/^https:\/\//, "")}
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
        <span className="sr-only">{t.modules.resources.opensInNewTab}</span>
      </a>
      <p className="mt-0.5 text-xs text-text-secondary">{l.usedIn(reference.questions)} · {l.example(reference.exampleQuestion)}</p>
    </li>
  );
}
