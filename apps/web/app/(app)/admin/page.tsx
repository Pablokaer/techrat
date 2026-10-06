"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power } from "lucide-react";
import { Card, DifficultyBadge, cx } from "@techrat/ui";
import { DIFFICULTIES, type AdminQuestion, type AdminQuestionInput, type Difficulty } from "@techrat/types";
import { isApiError } from "@techrat/api";
import { api, unwrap } from "@/lib/api";
import { useMe, useRoadmaps, useTopics } from "@/lib/queries";
import { EmptyState, PageHeader, Tabs } from "@/components/widgets";
import { useToast } from "@/components/providers";
import { useFormat, useT } from "@/i18n";

type Tab = "questions" | "topics" | "roadmaps" | "users";

export default function AdminPage() {
  const t = useT();
  const f = useFormat();
  const { data: me } = useMe();
  const [tab, setTab] = useState<Tab>("questions");
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => unwrap(api.GET("/api/v1/admin/stats")), enabled: !!me?.isAdmin });

  if (!me?.isAdmin) return <EmptyState title={t.admin.adminsOnly} text={t.admin.adminsOnlyText} />;
  return (
    <>
      <PageHeader eyebrow={t.admin.eyebrow} title={t.admin.title} subtitle={t.admin.subtitle} />
      <p className="-mt-2 mb-6 text-xs text-text-muted">{t.admin.contentLanguageNote}</p>
      {stats && (
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Object.entries(stats).map(([k, v]) => (
            <Card key={k} as="div" className="p-3"><dt className="text-[11px] uppercase tracking-wider text-text-muted">{t.admin.stats[k] ?? k.replace(/([A-Z])/g, " $1")}</dt><dd className="font-mono text-lg font-bold">{f.number(Number(v))}</dd></Card>
          ))}
        </dl>
      )}
      <Tabs<Tab> label={t.admin.sections} value={tab} onChange={setTab} items={[
        { value: "questions", label: t.admin.tabs.questions }, { value: "topics", label: t.admin.tabs.topics }, { value: "roadmaps", label: t.admin.tabs.roadmaps }, { value: "users", label: t.admin.tabs.users },
      ]} />
      <div className="mt-6">
        {tab === "questions" && <QuestionsAdmin />}
        {tab === "topics" && <TopicsAdmin />}
        {tab === "roadmaps" && <RoadmapsAdmin />}
        {tab === "users" && <UsersAdmin />}
      </div>
    </>
  );
}

const emptyQuestion = (): AdminQuestionInput => ({
  topicSlug: "", subtopicSlug: "", difficulty: "Easy", title: "", questionText: "", explanation: "", referenceUrl: "https://",
  xpReward: null, isActive: true, options: [0, 1, 2, 3].map((i) => ({ text: "", isCorrect: i === 0 })),
});

function QuestionsAdmin() {
  const t = useT();
  const f = useFormat();
  const m = t.admin.questions;
  const qc = useQueryClient();
  const toast = useToast();
  const { data: topics } = useTopics();
  const [filters, setFilters] = useState({ topic: "", difficulty: "" as Difficulty | "", search: "", page: 1 });
  const [editing, setEditing] = useState<{ id?: string; input: AdminQuestionInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const { data } = useQuery({
    queryKey: ["admin-questions", filters],
    queryFn: () => unwrap(api.GET("/api/v1/admin/questions", { params: { query: {
      topic: filters.topic || undefined, difficulty: filters.difficulty || undefined, search: filters.search || undefined, page: filters.page, pageSize: 20,
    } } })),
    placeholderData: keepPreviousData,
  });

  const edit = (q: AdminQuestion) => setEditing({ id: q.id, input: {
    topicSlug: q.topicSlug, subtopicSlug: q.subtopicSlug, difficulty: q.difficulty, title: q.title, questionText: q.questionText,
    explanation: q.explanation, referenceUrl: q.referenceUrl, xpReward: q.xpReward, isActive: q.isActive,
    options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
  } });

  async function save() {
    if (!editing) return;
    try {
      if (editing.id) await unwrap(api.PUT("/api/v1/admin/questions/{id}", { params: { path: { id: editing.id } }, body: editing.input }));
      else await unwrap(api.POST("/api/v1/admin/questions", { body: editing.input }));
      toast({ kind: "success", title: m.saved });
      setEditing(null); setErrors({});
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
    } catch (e) {
      if (isApiError(e) && e.errors) setErrors(e.errors);
      else toast({ kind: "error", title: isApiError(e) ? e.detail ?? e.title : m.saveFailed });
    }
  }

  async function toggle(q: AdminQuestion) {
    const path = q.isActive ? "/api/v1/admin/questions/{id}/deactivate" : "/api/v1/admin/questions/{id}/activate";
    await api.POST(path, { params: { path: { id: q.id } } });
    qc.invalidateQueries({ queryKey: ["admin-questions"] });
  }

  const pages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;
  const sub = topics?.find((x) => x.slug === editing?.input.topicSlug)?.subtopics ?? [];
  const set = (patch: Partial<AdminQuestionInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input aria-label={m.search} className="input max-w-xs" placeholder={m.searchPlaceholder} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        <select aria-label={m.filterTopic} className="input max-w-xs" value={filters.topic} onChange={(e) => setFilters({ ...filters, topic: e.target.value, page: 1 })}>
          <option value="">{m.allTopics}</option>{topics?.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
        </select>
        <select aria-label={m.filterDifficulty} className="input max-w-40" value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as Difficulty, page: 1 })}>
          <option value="">{m.anyDifficulty}</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{t.common.difficulty[d] ?? d}</option>)}
        </select>
        <button className="btn-primary ml-auto" onClick={() => { setEditing({ input: emptyQuestion() }); setErrors({}); }}><Plus className="h-4 w-4" /> {m.newQuestion}</button>
      </div>

      {editing && (
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">{editing.id ? m.editQuestion : m.newQuestion}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <select aria-label={m.topic} className="input" value={editing.input.topicSlug} onChange={(e) => set({ topicSlug: e.target.value, subtopicSlug: "" })}>
              <option value="">{m.topicPlaceholder}</option>{topics?.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
            </select>
            <select aria-label={m.subtopic} className="input" value={editing.input.subtopicSlug} onChange={(e) => set({ subtopicSlug: e.target.value })}>
              <option value="">{m.subtopicPlaceholder}</option>{sub.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
            <select aria-label={m.difficulty} className="input" value={editing.input.difficulty} onChange={(e) => set({ difficulty: e.target.value as Difficulty })}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{t.common.difficulty[d] ?? d}</option>)}
            </select>
          </div>
          <input aria-label={m.title} className="input" placeholder={m.titlePlaceholder} value={editing.input.title} onChange={(e) => set({ title: e.target.value })} />
          <textarea aria-label={m.questionText} className="input min-h-24" placeholder={m.questionPlaceholder} value={editing.input.questionText} onChange={(e) => set({ questionText: e.target.value })} />
          <fieldset className="space-y-2">
            <legend className="label">{m.options}</legend>
            {editing.input.options.map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <input type="radio" name="correct" aria-label={m.optionCorrect(i + 1)} checked={o.isCorrect} onChange={() => set({ options: editing.input.options.map((x, j) => ({ ...x, isCorrect: j === i })) })} className="h-4 w-4 accent-[#00ff41]" />
                <input aria-label={m.option(i + 1)} className="input" value={o.text} onChange={(e) => set({ options: editing.input.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
              </div>
            ))}
          </fieldset>
          <textarea aria-label={m.explanation} className="input min-h-20" placeholder={m.explanationPlaceholder} value={editing.input.explanation} onChange={(e) => set({ explanation: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
            <input aria-label={m.referenceUrl} className="input" value={editing.input.referenceUrl} onChange={(e) => set({ referenceUrl: e.target.value })} />
            <input aria-label={m.xpReward} type="number" min={0} className="input" placeholder={m.xpPlaceholder} value={editing.input.xpReward ?? ""} onChange={(e) => set({ xpReward: e.target.value === "" ? null : Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.input.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="accent-[#00ff41]" /> {m.active}</label>
          </div>
          {Object.keys(errors).length > 0 && <ul role="alert" className="text-sm text-error">{Object.entries(errors).map(([k, v]) => <li key={k}>{k}: {v[0]}</li>)}</ul>}
          <div className="flex gap-2"><button className="btn-primary" onClick={save}>{m.save}</button><button className="btn-ghost" onClick={() => setEditing(null)}>{m.cancel}</button></div>
        </Card>
      )}

      <Card className="divide-y divide-border-subtle">
        {data?.items.map((q) => (
          <div key={q.id} className={cx("flex flex-wrap items-center gap-3 p-4", !q.isActive && "opacity-50")}>
            <DifficultyBadge difficulty={q.difficulty} label={t.common.difficulty[q.difficulty] ?? q.difficulty} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{q.title}</p>
              <p className="truncate text-xs text-text-muted">{q.topicSlug} › {q.subtopicSlug} · {t.common.xp(q.xpReward)} {q.externalKey ? `· ${q.externalKey}` : ""}</p>
            </div>
            <button className="btn-ghost px-2" onClick={() => edit(q)} aria-label={m.edit(q.title)}><Pencil className="h-4 w-4" /></button>
            <button className="btn-ghost px-2" onClick={() => toggle(q)} aria-label={q.isActive ? m.deactivate(q.title) : m.activate(q.title)}><Power className={cx("h-4 w-4", q.isActive ? "text-primary" : "text-error")} /></button>
          </div>
        ))}
      </Card>
      <div className="flex items-center justify-between text-sm text-text-secondary">
        <span>{m.count(f.number(data?.totalCount ?? 0))}</span>
        <span className="flex items-center gap-2">
          <button className="btn-secondary px-3 py-1.5" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>{m.prev}</button>
          {filters.page}/{pages}
          <button className="btn-secondary px-3 py-1.5" disabled={filters.page >= pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>{m.next}</button>
        </span>
      </div>
    </div>
  );
}

function useAdminAction() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  return async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast({ kind: "success", title: success });
      qc.invalidateQueries();
      return true;
    } catch (e) {
      toast({ kind: "error", title: isApiError(e) ? (e.errors ? Object.values(e.errors)[0][0] : e.detail ?? e.title) : t.admin.failed });
      return false;
    }
  };
}

function TopicsAdmin() {
  const tr = useT();
  const m = tr.admin.topics;
  const { data: topics } = useTopics();
  const run = useAdminAction();
  const [t, setT] = useState({ slug: "", name: "", description: "", category: "", icon: "code" });
  const [s, setS] = useState({ topic: "", slug: "", name: "" });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">{m.createTopic}</h2>
        {(["slug", "name", "category", "icon", "description"] as const).map((k) => <input key={k} aria-label={tr.admin.fields[k]} placeholder={tr.admin.fields[k]} className="input" value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} />)}
        <button className="btn-primary" onClick={() => run(() => unwrap(api.POST("/api/v1/admin/topics", { body: { ...t, isActive: true } })), m.topicCreated)}>{m.createTopic}</button>
      </Card>
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">{m.createSubtopic}</h2>
        <select aria-label={m.topic} className="input" value={s.topic} onChange={(e) => setS({ ...s, topic: e.target.value })}><option value="">{m.topicPlaceholder}</option>{topics?.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
        <input aria-label={m.subtopicSlug} placeholder={tr.admin.fields.slug} className="input" value={s.slug} onChange={(e) => setS({ ...s, slug: e.target.value })} />
        <input aria-label={m.subtopicName} placeholder={tr.admin.fields.name} className="input" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
        <button className="btn-primary" disabled={!s.topic} onClick={() => run(() => unwrap(api.POST("/api/v1/admin/topics/{slug}/subtopics", { params: { path: { slug: s.topic } }, body: { slug: s.slug, name: s.name } })), m.subtopicCreated)}>{m.createSubtopic}</button>
      </Card>
    </div>
  );
}

function RoadmapsAdmin() {
  const t = useT();
  const m = t.admin.roadmaps;
  const { data: roadmaps } = useRoadmaps();
  const { data: topics } = useTopics();
  const run = useAdminAction();
  const [r, setR] = useState({ slug: "", name: "", description: "", category: "", difficulty: "Beginner" as const, estimatedHours: 10, icon: "map", isPublished: true, xpReward: 1000 });
  const [step, setStep] = useState({ roadmap: "", newModuleTitle: "", title: "", topicSlug: "", subtopicSlug: "", minimumQuestions: 5, minimumAccuracy: 70, xpReward: 50 });
  const subs = topics?.find((x) => x.slug === step.topicSlug)?.subtopics ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">{m.createRoadmap}</h2>
        {(["slug", "name", "category", "icon", "description"] as const).map((k) => <input key={k} aria-label={t.admin.fields[k]} placeholder={t.admin.fields[k]} className="input" value={r[k]} onChange={(e) => setR({ ...r, [k]: e.target.value })} />)}
        <button className="btn-primary" onClick={() => run(() => unwrap(api.POST("/api/v1/admin/roadmaps", { body: r })), m.roadmapCreated)}>{m.createRoadmap}</button>
      </Card>
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">{m.addStep}</h2>
        <select aria-label={m.roadmap} className="input" value={step.roadmap} onChange={(e) => setStep({ ...step, roadmap: e.target.value })}><option value="">{m.roadmapPlaceholder}</option>{roadmaps?.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
        <input aria-label={m.moduleTitle} placeholder={m.moduleTitlePlaceholder} className="input" value={step.newModuleTitle} onChange={(e) => setStep({ ...step, newModuleTitle: e.target.value })} />
        <input aria-label={m.stepTitle} placeholder={m.stepTitle} className="input" value={step.title} onChange={(e) => setStep({ ...step, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <select aria-label={m.stepTopic} className="input" value={step.topicSlug} onChange={(e) => setStep({ ...step, topicSlug: e.target.value, subtopicSlug: "" })}><option value="">{m.topicPlaceholder}</option>{topics?.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
          <select aria-label={m.stepSubtopic} className="input" value={step.subtopicSlug} onChange={(e) => setStep({ ...step, subtopicSlug: e.target.value })}><option value="">{m.wholeTopic}</option>{subs.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs text-text-secondary">{m.minQuestions}<input type="number" className="input mt-1" value={step.minimumQuestions} onChange={(e) => setStep({ ...step, minimumQuestions: Number(e.target.value) })} /></label>
          <label className="text-xs text-text-secondary">{m.minAccuracy}<input type="number" className="input mt-1" value={step.minimumAccuracy} onChange={(e) => setStep({ ...step, minimumAccuracy: Number(e.target.value) })} /></label>
          <label className="text-xs text-text-secondary">{m.xp}<input type="number" className="input mt-1" value={step.xpReward} onChange={(e) => setStep({ ...step, xpReward: Number(e.target.value) })} /></label>
        </div>
        <button className="btn-primary" disabled={!step.roadmap} onClick={() => run(() => unwrap(api.POST("/api/v1/admin/roadmaps/{slug}/steps", { params: { path: { slug: step.roadmap } }, body: {
          moduleId: null, newModuleTitle: step.newModuleTitle, title: step.title, description: "", difficulty: "Medium", estimatedMinutes: 45,
          topicSlug: step.topicSlug, subtopicSlug: step.subtopicSlug || null, minimumQuestions: step.minimumQuestions, minimumAccuracy: step.minimumAccuracy, xpReward: step.xpReward, order: null,
        } })), m.stepAdded)}>{m.addStep}</button>
      </Card>
    </div>
  );
}

function UsersAdmin() {
  const t = useT();
  const f = useFormat();
  const m = t.admin.users;
  const [search, setSearch] = useState("");
  const { data } = useQuery({ queryKey: ["admin-users", search], queryFn: () => unwrap(api.GET("/api/v1/admin/users", { params: { query: { search: search || undefined, pageSize: 50 } } })), placeholderData: keepPreviousData });
  return (
    <div className="space-y-4">
      <input aria-label={m.search} className="input max-w-sm" placeholder={m.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-text-muted"><tr>{(["user", "email", "level", "xp", "answered", "accuracy", "joined"] as const).map((h) => <th key={h} className="px-4 py-3 font-medium">{m.columns[h]}</th>)}</tr></thead>
          <tbody>
            {data?.items.map((u) => (
              <tr key={u.id} className="border-t border-border-subtle">
                <td className="px-4 py-3"><span className="font-semibold">{u.displayName}</span> <span className="font-mono text-xs text-text-muted">@{u.username}</span></td>
                <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                <td className="px-4 py-3 font-mono">{u.level}</td>
                <td className="px-4 py-3 font-mono">{u.xp}</td>
                <td className="px-4 py-3 font-mono">{u.questionsAnswered}</td>
                <td className="px-4 py-3 font-mono">{Math.round(u.accuracy)}%</td>
                <td className="px-4 py-3 text-text-secondary">{f.date(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
