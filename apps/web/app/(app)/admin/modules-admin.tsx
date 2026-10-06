"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Card, cx } from "@techrat/ui";
import { DIFFICULTIES, type AdminModule, type AdminModuleInput, type Difficulty, type ModuleKind } from "@techrat/types";
import { api, unwrap } from "@/lib/api";
import { useTopics } from "@/lib/queries";
import { useT } from "@/i18n";
import { ADMIN_MODULES_KEY, useAdminAction } from "./use-admin-action";

const MODULE_KINDS: ModuleKind[] = ["Core", "Context", "BestPractices", "Capstone"];
const LEVELS: AdminModuleInput["level"][] = ["Beginner", "Intermediate", "Advanced", "Expert"];

const emptyModule = (): AdminModuleInput => ({
  slug: "", name: "", description: "", kind: "Core", category: "", level: "Beginner", icon: "box", isPublished: true, isStandalone: false, xpReward: 500,
});

const emptyStep = () => ({ module: "", title: "", topicSlug: "", subtopicSlug: "", difficulty: "Medium" as Difficulty, minimumQuestions: 5, minimumAccuracy: 70, xpReward: 50 });

/** Module catalog: list every module, create or edit one, and append steps to it. */
export function ModulesAdmin() {
  const t = useT();
  const m = t.admin.modules;
  const run = useAdminAction();
  const { data: modules } = useQuery({ queryKey: ADMIN_MODULES_KEY, queryFn: () => unwrap(api.GET("/api/v1/admin/modules")) });
  const { data: topics } = useTopics();
  const [form, setForm] = useState<{ slug: string | null; input: AdminModuleInput }>({ slug: null, input: emptyModule() });
  const [step, setStep] = useState(emptyStep);
  const subs = topics?.find((x) => x.slug === step.topicSlug)?.subtopics ?? [];
  const set = (patch: Partial<AdminModuleInput>) => setForm((f) => ({ ...f, input: { ...f.input, ...patch } }));

  const edit = (x: AdminModule) => setForm({ slug: x.slug, input: {
    slug: x.slug, name: x.name, description: x.description, kind: x.kind, category: x.category, level: x.level, icon: x.icon,
    isPublished: x.isPublished, isStandalone: x.isStandalone, xpReward: x.xpReward,
  } });

  async function save() {
    const ok = form.slug
      ? await run(() => unwrap(api.PUT("/api/v1/admin/modules/{slug}", { params: { path: { slug: form.slug! } }, body: form.input })), m.moduleSaved)
      : await run(() => unwrap(api.POST("/api/v1/admin/modules", { body: form.input })), m.moduleCreated);
    if (ok) setForm({ slug: null, input: emptyModule() });
  }

  async function addStep() {
    const ok = await run(() => unwrap(api.POST("/api/v1/admin/modules/{slug}/steps", { params: { path: { slug: step.module } }, body: {
      moduleId: null, newModuleTitle: null, title: step.title, description: "", difficulty: step.difficulty, estimatedMinutes: 45,
      topicSlug: step.topicSlug, subtopicSlug: step.subtopicSlug || null, minimumQuestions: step.minimumQuestions, minimumAccuracy: step.minimumAccuracy,
      xpReward: step.xpReward, order: null,
    } })), m.stepAdded);
    if (ok) setStep({ ...emptyStep(), module: step.module });
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-x-auto">
        <table aria-label={m.catalog} className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-text-muted">
            <tr>{(["slug", "name", "kind", "steps", "version", "usedIn", "source", "actions"] as const).map((h) => <th key={h} className="px-4 py-3 font-medium">{m.columns[h]}</th>)}</tr>
          </thead>
          <tbody>
            {modules?.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-text-muted">{m.empty}</td></tr>}
            {modules?.map((x) => (
              <tr key={x.id} className={cx("border-t border-border-subtle", !x.isPublished && "opacity-60")}>
                <td className="px-4 py-3 font-mono text-xs">{x.slug}</td>
                <td className="px-4 py-3 font-semibold">{x.name}</td>
                <td className="px-4 py-3 text-text-secondary">{m.kinds[x.kind] ?? x.kind}</td>
                <td className="px-4 py-3 font-mono">{x.steps.length}</td>
                <td className="px-4 py-3 font-mono">{m.version(x.version)}</td>
                <td className="px-4 py-3 text-xs text-text-secondary">{x.usedInRoadmaps.length ? x.usedInRoadmaps.join(", ") : "—"}</td>
                <td className="px-4 py-3">
                  <span title={x.seedManaged ? m.seedManagedHint : m.customisedHint} className={cx("rounded-md border px-2 py-0.5 text-xs", x.seedManaged ? "border-border-subtle text-text-muted" : "border-primary/40 text-text")}>
                    {x.seedManaged ? m.seedManaged : m.customised}
                  </span>
                </td>
                <td className="px-4 py-3"><button className="btn-ghost px-2" onClick={() => edit(x)} aria-label={m.edit(x.name)}><Pencil className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">{form.slug ? m.editModule : m.createModule}</h2>
          {(["slug", "name", "category", "icon", "description"] as const).map((k) => (
            <input key={k} aria-label={t.admin.fields[k]} placeholder={t.admin.fields[k]} className="input" disabled={k === "slug" && !!form.slug} value={form.input[k]} onChange={(e) => set({ [k]: e.target.value })} />
          ))}
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-text-secondary">{m.kind}
              <select aria-label={m.kind} className="input mt-1" value={form.input.kind} onChange={(e) => set({ kind: e.target.value as ModuleKind })}>
                {MODULE_KINDS.map((k) => <option key={k} value={k}>{m.kinds[k] ?? k}</option>)}
              </select>
            </label>
            <label className="text-xs text-text-secondary">{m.level}
              <select aria-label={m.level} className="input mt-1" value={form.input.level} onChange={(e) => set({ level: e.target.value as AdminModuleInput["level"] })}>
                {LEVELS.map((l) => <option key={l} value={l}>{t.common.roadmapDifficulty[l] ?? l}</option>)}
              </select>
            </label>
            <label className="text-xs text-text-secondary">{m.xpReward}
              <input aria-label={m.xpReward} type="number" min={0} className="input mt-1" value={form.input.xpReward} onChange={(e) => set({ xpReward: Number(e.target.value) })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.input.isPublished} onChange={(e) => set({ isPublished: e.target.checked })} className="accent-[#00ff41]" /> {m.published}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.input.isStandalone} onChange={(e) => set({ isStandalone: e.target.checked })} className="accent-[#00ff41]" /> {m.standalone}</label>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={save}>{form.slug ? m.save : m.createModule}</button>
            {form.slug && <button className="btn-ghost" onClick={() => setForm({ slug: null, input: emptyModule() })}>{m.cancel}</button>}
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">{m.addStep}</h2>
          <p className="text-xs text-text-muted">{m.versionNote}</p>
          <select aria-label={m.module} className="input" value={step.module} onChange={(e) => setStep({ ...step, module: e.target.value })}>
            <option value="">{m.modulePlaceholder}</option>
            {modules?.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
          </select>
          <input aria-label={m.stepTitle} placeholder={m.stepTitle} className="input" value={step.title} onChange={(e) => setStep({ ...step, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select aria-label={m.stepTopic} className="input" value={step.topicSlug} onChange={(e) => setStep({ ...step, topicSlug: e.target.value, subtopicSlug: "" })}>
              <option value="">{m.topicPlaceholder}</option>{topics?.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
            </select>
            <select aria-label={m.stepSubtopic} className="input" value={step.subtopicSlug} onChange={(e) => setStep({ ...step, subtopicSlug: e.target.value })}>
              <option value="">{m.wholeTopic}</option>{subs.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-xs text-text-secondary">{m.difficulty}
              <select aria-label={m.difficulty} className="input mt-1" value={step.difficulty} onChange={(e) => setStep({ ...step, difficulty: e.target.value as Difficulty })}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{t.common.difficulty[d] ?? d}</option>)}
              </select>
            </label>
            <label className="text-xs text-text-secondary">{m.minQuestions}<input type="number" min={1} className="input mt-1" value={step.minimumQuestions} onChange={(e) => setStep({ ...step, minimumQuestions: Number(e.target.value) })} /></label>
            <label className="text-xs text-text-secondary">{m.minAccuracy}<input type="number" min={0} max={100} className="input mt-1" value={step.minimumAccuracy} onChange={(e) => setStep({ ...step, minimumAccuracy: Number(e.target.value) })} /></label>
            <label className="text-xs text-text-secondary">{m.xp}<input type="number" min={0} className="input mt-1" value={step.xpReward} onChange={(e) => setStep({ ...step, xpReward: Number(e.target.value) })} /></label>
          </div>
          <button className="btn-primary" disabled={!step.module || !step.topicSlug} onClick={addStep}>{m.addStep}</button>
        </Card>
      </div>
    </div>
  );
}
