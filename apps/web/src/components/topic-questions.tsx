"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Circle, Play, X } from "lucide-react";
import { Card, DifficultyBadge, cx } from "@techrat/ui";
import { DIFFICULTIES, type Difficulty, type TopicQuestion } from "@techrat/types";
import { isApiError } from "@techrat/api";
import { useStartPractice, useTopicQuestions } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { useT } from "@/i18n";
import { useToast } from "@/components/providers";
import { Skeleton } from "@/components/widgets";

/** Same limit as the API (PracticeService.MaxQuestionsPerSession). */
export const MAX_LEARN_QUESTIONS = 50;

const STATUS_ICON = { New: Circle, Correct: Check, Wrong: X } as const;
const STATUS_TONE = { New: "text-text-muted", Correct: "text-primary", Wrong: "text-error" } as const;

/**
 * Learn: every question of a topic, filtered by difficulty and subtopic, with the learner's latest result. The learner
 * picks questions and answers exactly those (a "Learn" practice session, in list order).
 */
export function TopicQuestions({ topicSlug, subtopics, initialSubtopic }: {
  topicSlug: string;
  subtopics: { slug: string; name: string }[];
  initialSubtopic?: string | null;
}) {
  const t = useT();
  const tq = t.learn.topic.questions;
  const router = useRouter();
  const toast = useToast();
  const start = useStartPractice();
  const { data, isLoading } = useTopicQuestions(topicSlug);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [subtopic, setSubtopic] = useState(initialSubtopic ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const all = useMemo(() => data ?? [], [data]);
  const visible = all.filter((q) => (!difficulty || q.difficulty === difficulty) && (!subtopic || q.subtopicSlug === subtopic));
  const full = selected.size >= MAX_LEARN_QUESTIONS;

  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else if (next.size < MAX_LEARN_QUESTIONS) next.add(id);
    return next;
  });
  const selectVisible = () => setSelected((s) => {
    const next = new Set(s);
    for (const q of visible) if (next.size < MAX_LEARN_QUESTIONS) next.add(q.id);
    return next;
  });

  async function answer(ids: string[]) {
    try {
      const session = await start.mutateAsync({ mode: "Learn", questionIds: ids });
      router.push(routes.session(session.id));
    } catch (e) {
      toast({ kind: "error", title: isApiError(e) ? e.detail ?? e.title : tq.startError });
    }
  }
  // Keep the list order (easiest first), whatever the order of the clicks.
  const answerSelected = () => answer(all.filter((q) => selected.has(q.id)).map((q) => q.id));

  return (
    <section aria-labelledby="topic-questions" className="mt-8">
      <h2 id="topic-questions" className="text-lg font-bold">{tq.heading}</h2>
      <p className="mt-1 text-sm text-text-secondary">{tq.subtitle}</p>

      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div role="radiogroup" aria-label={tq.difficultyLabel} className="flex flex-wrap gap-2">
            {(["", ...DIFFICULTIES] as const).map((d) => (
              <button key={d || "all"} type="button" role="radio" aria-checked={difficulty === d} onClick={() => setDifficulty(d)}
                className={cx("rounded-xl border px-3 py-1.5 text-sm font-medium", difficulty === d ? "glow-border bg-primary/10" : "border-border bg-bg-2")}>
                {d ? <DifficultyBadge difficulty={d} label={t.common.difficulty[d] ?? d} /> : tq.allDifficulties}
              </button>
            ))}
          </div>
          <div className="md:w-64">
            <label htmlFor="learn-subtopic" className="label">{tq.subtopic}</label>
            <select id="learn-subtopic" className="input" value={subtopic} onChange={(e) => setSubtopic(e.target.value)}>
              <option value="">{tq.allSubtopics}</option>
              {subtopics.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
          <button type="button" onClick={selectVisible} disabled={visible.length === 0 || full} className="btn-ghost px-3 py-1.5 text-sm">{tq.selectAll(visible.length)}</button>
          <button type="button" onClick={() => setSelected(new Set())} disabled={selected.size === 0} className="btn-ghost px-3 py-1.5 text-sm">{tq.clear}</button>
          <span className="text-xs text-text-muted">{tq.limit(MAX_LEARN_QUESTIONS)}</span>
          <button type="button" onClick={answerSelected} disabled={selected.size === 0 || start.isPending} className="btn-primary w-full sm:ml-auto sm:w-auto">
            <Play className="h-4 w-4" aria-hidden /> {tq.answerSelected(selected.size)}
          </button>
        </div>
      </Card>

      {isLoading ? <Skeleton className="mt-3 h-64" /> : (
        <ul aria-label={tq.heading} className="mt-3 space-y-2">
          {visible.map((q) => <QuestionRow key={q.id} q={q} checked={selected.has(q.id)} disabled={full && !selected.has(q.id)}
            onToggle={() => toggle(q.id)} onAnswer={() => answer([q.id])} busy={start.isPending} />)}
        </ul>
      )}
      {!isLoading && visible.length === 0 && <p className="mt-3 rounded-2xl border border-border bg-card p-6 text-center text-sm text-text-muted">{tq.empty}</p>}
    </section>
  );
}

function QuestionRow({ q, checked, disabled, busy, onToggle, onAnswer }: {
  q: TopicQuestion; checked: boolean; disabled: boolean; busy: boolean; onToggle: () => void; onAnswer: () => void;
}) {
  const t = useT();
  const tq = t.learn.topic.questions;
  const StatusIcon = STATUS_ICON[q.status];
  return (
    <li className={cx("flex items-center gap-3 rounded-2xl border bg-card px-4 py-3", checked ? "glow-border" : "border-border")}>
      <input type="checkbox" id={`learn-q-${q.id}`} checked={checked} disabled={disabled} onChange={onToggle}
        aria-label={q.title} className="h-5 w-5 shrink-0 accent-primary" />
      <label htmlFor={`learn-q-${q.id}`} className="min-w-0 flex-1 cursor-pointer">
        <span className="block font-medium">{q.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
          <DifficultyBadge difficulty={q.difficulty} label={t.common.difficulty[q.difficulty] ?? q.difficulty} />
          <span>{q.subtopicName}</span>
          <span className={cx("inline-flex items-center gap-1", STATUS_TONE[q.status])}>
            <StatusIcon className="h-3.5 w-3.5" aria-hidden /> {tq.status[q.status] ?? q.status}
          </span>
        </span>
      </label>
      <button type="button" onClick={onAnswer} disabled={busy} className="btn-secondary shrink-0 px-3 py-1.5 text-sm">{tq.answerOne}</button>
    </li>
  );
}
