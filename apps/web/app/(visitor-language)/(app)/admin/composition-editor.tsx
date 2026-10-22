"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Card, cx } from "@techrat/ui";
import type { AdminComposition, AdminRoadmapLink } from "@techrat/types";
import { api, unwrap } from "@/lib/api";
import { useRoadmaps } from "@/lib/queries";
import { useT } from "@/i18n";
import { ADMIN_MODULES_KEY, useAdminAction } from "./use-admin-action";

const compositionKey = (slug: string) => ["admin-composition", slug] as const;

/**
 * Edits the ordered module list of one roadmap. Reorders and required/optional changes are applied optimistically and
 * saved as the full ordered list (PUT); adding and removing use POST/DELETE. Any edit makes the composition
 * "customised", so the seed stops updating it — the banner shows which state the roadmap is in.
 */
export function CompositionEditor() {
  const t = useT();
  const m = t.admin.composition;
  const kinds = t.admin.modules.kinds;
  const qc = useQueryClient();
  const run = useAdminAction();
  const { data: roadmaps } = useRoadmaps();
  const { data: modules } = useQuery({ queryKey: ADMIN_MODULES_KEY, queryFn: () => unwrap(api.GET("/api/v1/admin/modules")) });
  const [slug, setSlug] = useState("");
  const [adding, setAdding] = useState({ moduleSlug: "", isRequired: true });
  const [busy, setBusy] = useState(false);
  const key = compositionKey(slug);
  const { data: composition } = useQuery({
    queryKey: key,
    queryFn: () => unwrap(api.GET("/api/v1/admin/roadmaps/{slug}/modules", { params: { path: { slug } } })),
    enabled: !!slug,
  });

  const links = composition?.modules ?? [];
  const available = (modules ?? []).filter((x) => !links.some((l) => l.moduleSlug === x.slug));

  async function write(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    const ok = await run(fn, success);
    if (!ok) qc.invalidateQueries({ queryKey: key }); // drop the optimistic state
    setBusy(false);
  }

  function saveList(next: AdminRoadmapLink[]) {
    qc.setQueryData<AdminComposition>(key, (c) => (c ? { ...c, modules: next.map((l, i) => ({ ...l, order: i + 1 })) } : c));
    return write(() => unwrap(api.PUT("/api/v1/admin/roadmaps/{slug}/modules", { params: { path: { slug } }, body: {
      modules: next.map((l) => ({ moduleSlug: l.moduleSlug, isRequired: l.isRequired })),
    } })), m.saved);
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...links];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return saveList(next);
  }

  const setRequired = (moduleSlug: string, isRequired: boolean) =>
    saveList(links.map((l) => (l.moduleSlug === moduleSlug ? { ...l, isRequired } : l)));

  const remove = (moduleSlug: string) =>
    write(() => unwrap(api.DELETE("/api/v1/admin/roadmaps/{slug}/modules/{moduleSlug}", { params: { path: { slug, moduleSlug } } })), m.moduleRemoved);

  async function add() {
    await write(() => unwrap(api.POST("/api/v1/admin/roadmaps/{slug}/modules", { params: { path: { slug } }, body: adding })), m.moduleAdded);
    setAdding({ moduleSlug: "", isRequired: true });
  }

  return (
    <Card className="space-y-4 p-5 lg:col-span-2">
      <h2 className="font-semibold">{m.title}</h2>
      <select aria-label={m.roadmap} className="input max-w-sm" value={slug} onChange={(e) => setSlug(e.target.value)}>
        <option value="">{m.roadmapPlaceholder}</option>
        {roadmaps?.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
      </select>

      {composition && (
        <>
          <p role="status" className={cx("rounded-lg border px-3 py-2 text-xs", composition.seedManaged ? "border-border-subtle text-text-muted" : "border-primary/40 text-text")}>
            {composition.seedManaged ? m.seedManaged : m.customised}
          </p>
          {links.length === 0 ? (
            <p className="text-sm text-text-muted">{m.empty}</p>
          ) : (
            <ol aria-label={m.list} className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              {links.map((l, i) => (
                <li key={l.moduleSlug} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="w-6 font-mono text-xs text-text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.moduleName}</p>
                    <p className="truncate text-xs text-text-muted"><span className="font-mono">{l.moduleSlug}</span> · {kinds[l.kind] ?? l.kind} · {m.steps(l.steps)}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <input type="checkbox" aria-label={m.isRequired(l.moduleName)} checked={l.isRequired} disabled={busy} onChange={(e) => setRequired(l.moduleSlug, e.target.checked)} className="accent-[#00ff41]" />
                    {m.required}
                  </label>
                  <button className="btn-ghost px-2" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={m.moveUp(l.moduleName)}><ArrowUp className="h-4 w-4" /></button>
                  <button className="btn-ghost px-2" disabled={busy || i === links.length - 1} onClick={() => move(i, 1)} aria-label={m.moveDown(l.moduleName)}><ArrowDown className="h-4 w-4" /></button>
                  <button className="btn-ghost px-2" disabled={busy} onClick={() => remove(l.moduleSlug)} aria-label={m.remove(l.moduleName)}><Trash2 className="h-4 w-4 text-error" /></button>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <select aria-label={m.addModule} className="input max-w-sm" value={adding.moduleSlug} onChange={(e) => setAdding({ ...adding, moduleSlug: e.target.value })}>
              <option value="">{m.addModulePlaceholder}</option>
              {available.map((x) => <option key={x.slug} value={x.slug}>{x.name} ({kinds[x.kind] ?? x.kind})</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={adding.isRequired} onChange={(e) => setAdding({ ...adding, isRequired: e.target.checked })} className="accent-[#00ff41]" /> {m.required}
            </label>
            <button className="btn-primary" disabled={busy || !adding.moduleSlug} onClick={add}><Plus className="h-4 w-4" /> {m.add}</button>
          </div>
        </>
      )}
    </Card>
  );
}
