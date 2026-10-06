"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Brain, Dices, Play, Swords, Target } from "lucide-react";
import { Card, DifficultyBadge, cx } from "@techrat/ui";
import { DIFFICULTIES, type Difficulty, type PracticeMode } from "@techrat/types";
import { isApiError } from "@techrat/api";
import { useStartPractice, useTopics } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { useT } from "@/i18n";
import { PageHeader, Skeleton } from "@/components/widgets";
import { useToast } from "@/components/providers";

// Labels and descriptions come from t.practice.modes / t.practice.modeText, keyed by the API enum value.
const MODES: { value: PracticeMode; icon: typeof Target }[] = [
  { value: "Practice", icon: Target },
  { value: "Challenge", icon: Swords },
  { value: "Adaptive", icon: Brain },
  { value: "Random", icon: Dices },
];
const COUNTS = [5, 10, 15, 20];

function PracticeSetup() {
  const t = useT();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data: topics, isLoading } = useTopics();
  const start = useStartPractice();

  const [mode, setMode] = useState<PracticeMode>((params.get("mode") as PracticeMode) || "Practice");
  const [topic, setTopic] = useState(params.get("topic") ?? "");
  const [subtopic, setSubtopic] = useState(params.get("subtopic") ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">((params.get("difficulty") as Difficulty) || "");
  const [count, setCount] = useState(10);

  const selectedTopic = useMemo(() => topics?.find((x) => x.slug === topic), [topics, topic]);
  const topicRequired = mode === "Practice" || mode === "Challenge";
  const grouped = useMemo(() => {
    const g = new Map<string, NonNullable<typeof topics>>();
    topics?.forEach((x) => g.set(x.category, [...(g.get(x.category) ?? []), x]));
    return [...g.entries()];
  }, [topics]);

  async function onStart() {
    try {
      const s = await start.mutateAsync({
        mode,
        topicSlug: topic || null,
        subtopicSlug: subtopic || null,
        difficulty: difficulty || null,
        count,
      });
      router.push(routes.session(s.id));
    } catch (e) {
      toast({ kind: "error", title: isApiError(e) ? e.field("topicSlug") ?? e.detail ?? e.title : t.practice.setup.startError });
    }
  }

  const modeLabel = MODES.find((m) => m.value === mode) ? t.practice.modes[mode] ?? mode : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">{t.practice.setup.modeHeading}</h2>
          <div role="radiogroup" aria-label={t.practice.setup.modeLabel} className="grid gap-3 sm:grid-cols-2">
            {MODES.map(({ value, icon: Icon }) => (
              <button key={value} role="radio" aria-checked={mode === value} onClick={() => setMode(value)}
                className={cx("flex items-start gap-3 rounded-2xl border p-4 text-left", mode === value ? "glow-border bg-primary/10" : "border-border bg-bg-2 hover:border-primary/40")}>
                <Icon className={cx("mt-0.5 h-5 w-5", mode === value ? "text-primary" : "text-text-secondary")} aria-hidden />
                <span><span className="block font-semibold">{t.practice.modes[value] ?? value}</span><span className="block text-sm text-text-secondary">{t.practice.modeText[value]}</span></span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">{t.practice.setup.topicHeading} {topicRequired ? "" : <span className="text-sm font-normal text-text-muted">{t.practice.setup.optional}</span>}</h2>
          {isLoading ? <Skeleton className="h-12" /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="topic" className="label">{t.practice.setup.topic}</label>
                <select id="topic" className="input" value={topic} onChange={(e) => { setTopic(e.target.value); setSubtopic(""); }}>
                  <option value="">{topicRequired ? t.practice.setup.chooseTopic : t.practice.setup.allTopics}</option>
                  {grouped.map(([cat, list]) => (
                    <optgroup key={cat} label={cat}>
                      {list.map((x) => <option key={x.slug} value={x.slug}>{x.name} ({x.questions.easy + x.questions.medium + x.questions.hard + x.questions.expert})</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="subtopic" className="label">{t.practice.setup.subtopic}</label>
                <select id="subtopic" className="input" value={subtopic} onChange={(e) => setSubtopic(e.target.value)} disabled={!selectedTopic}>
                  <option value="">{t.practice.setup.allSubtopics}</option>
                  {selectedTopic?.subtopics.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.questionCount})</option>)}
                </select>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">{t.practice.setup.difficultyHeading}</h2>
          <div role="radiogroup" aria-label={t.practice.setup.difficultyLabel} className="flex flex-wrap gap-2">
            {(["", ...DIFFICULTIES] as const).map((d) => (
              <button key={d || "any"} role="radio" aria-checked={difficulty === d} disabled={mode === "Adaptive"} onClick={() => setDifficulty(d)}
                className={cx("rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-40", difficulty === d ? "glow-border bg-primary/10" : "border-border bg-bg-2")}>
                {d ? <DifficultyBadge difficulty={d} label={t.common.difficulty[d] ?? d} /> : t.practice.setup.any}
              </button>
            ))}
          </div>
          {mode === "Adaptive" && <p className="mt-2 text-xs text-text-muted">{t.practice.setup.adaptiveHint}</p>}
          <div role="radiogroup" aria-label={t.practice.setup.countLabel} className="mt-5 flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <button key={c} role="radio" aria-checked={count === c} onClick={() => setCount(c)}
                className={cx("min-w-16 rounded-xl border px-4 py-2 font-mono text-sm", count === c ? "glow-border bg-primary/10 text-primary" : "border-border bg-bg-2 text-text-secondary")}>
                {c}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <aside>
        <Card className="matrix-bg sticky top-24 p-6">
          <p className="eyebrow">{t.practice.setup.ready}</p>
          <p className="mt-3 text-xl font-bold">{selectedTopic?.name ?? (topicRequired ? t.practice.setup.pickTopic : t.practice.setup.mixedTopics)}</p>
          <p className="mt-1 text-sm text-text-secondary">
            {modeLabel} · {t.practice.setup.questions(count)}{difficulty ? ` · ${t.common.difficulty[difficulty] ?? difficulty}` : ""}
          </p>
          <ul className="mt-5 space-y-2 text-sm text-text-secondary">
            <li>{t.practice.setup.perkXp}</li>
            <li>{t.practice.setup.perkExplains}</li>
            <li>{t.practice.setup.perkOnce}</li>
          </ul>
          <button onClick={onStart} disabled={start.isPending || (topicRequired && !topic)} className="btn-primary mt-6 w-full py-3">
            <Play className="h-4 w-4" aria-hidden /> {start.isPending ? t.practice.setup.starting : t.practice.setup.start}
          </button>
        </Card>
      </aside>
    </div>
  );
}

export default function PracticePage() {
  const t = useT();
  return (
    <>
      <PageHeader eyebrow={t.practice.eyebrow} title={t.practice.title} subtitle={t.practice.subtitle} />
      <Suspense><PracticeSetup /></Suspense>
    </>
  );
}
