"use client";

import Link from "next/link";
import { useState } from "react";
import { Crown, Medal } from "lucide-react";
import { Card, cx } from "@techrat/ui";
import type { LeaderboardEntry, LeaderboardScope } from "@techrat/types";
import { useLeaderboard, useMe, useTopics } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/shell";
import { EmptyState, PageHeader, Skeleton, Tabs } from "@/components/widgets";
import { useFormat, useT } from "@/i18n";

export default function LeaderboardPage() {
  const [scope, setScope] = useState<LeaderboardScope>("Global");
  const [topic, setTopic] = useState("system-design");
  const [page, setPage] = useState(1);
  const { data: topics } = useTopics();
  const { data: me } = useMe();
  const { data, isLoading } = useLeaderboard(scope, scope === "Topic" ? topic : undefined, page);
  const pages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;
  const t = useT();

  return (
    <>
      <PageHeader eyebrow={t.leaderboard.eyebrow} title={t.leaderboard.title} subtitle={scope === "Weekly" ? t.leaderboard.subtitle.Weekly : scope === "Monthly" ? t.leaderboard.subtitle.Monthly : scope === "Topic" ? t.leaderboard.subtitle.Topic : t.leaderboard.subtitle.Global} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs<LeaderboardScope> label={t.leaderboard.scopeLabel} value={scope} onChange={(v) => { setScope(v); setPage(1); }}
          items={[{ value: "Global", label: t.leaderboard.scopes.Global }, { value: "Weekly", label: t.leaderboard.scopes.Weekly }, { value: "Monthly", label: t.leaderboard.scopes.Monthly }, { value: "Topic", label: t.leaderboard.scopes.Topic }]} />
        {scope === "Topic" && (
          <select aria-label={t.leaderboard.topic} className="input sm:max-w-xs" value={topic} onChange={(e) => { setTopic(e.target.value); setPage(1); }}>
            {topics?.map((topicItem) => <option key={topicItem.slug} value={topicItem.slug}>{topicItem.name}</option>)}
          </select>
        )}
      </div>

      {data?.me && (
        <Card className="glow-border mb-4 p-4">
          <Row entry={data.me} highlight label={t.leaderboard.you} />
        </Card>
      )}

      {isLoading ? <Skeleton className="h-96" /> : !data || data.entries.length === 0 ? (
        <EmptyState title={t.leaderboard.emptyTitle} text={t.leaderboard.emptyText} action={<Link href="/practice" className="btn-primary">{t.leaderboard.startPracticing}</Link>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[64px_1fr_80px_110px_90px_90px] gap-3 border-b border-border-subtle px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted md:grid">
            <span>{t.leaderboard.columns.rank}</span><span>{t.leaderboard.columns.learner}</span><span>{t.leaderboard.columns.level}</span><span>{t.leaderboard.columns.xp}</span><span>{t.leaderboard.columns.questions}</span><span>{t.leaderboard.columns.accuracy}</span>
          </div>
          <ol>
            {data.entries.map((e) => (
              <li key={e.userId} className={cx("border-b border-border-subtle px-5 py-3 last:border-0", e.userId === me?.id && "bg-primary/5")}>
                <Row entry={e} />
              </li>
            ))}
          </ol>
        </Card>
      )}
      {pages > 1 && (
        <nav aria-label={t.leaderboard.pagination} className="mt-4 flex items-center justify-center gap-3">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t.common.previous}</button>
          <span className="text-sm text-text-secondary">{t.leaderboard.pageOf(page, pages)}</span>
          <button className="btn-secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t.common.next}</button>
        </nav>
      )}
    </>
  );
}

function Row({ entry: e, highlight, label }: { entry: LeaderboardEntry; highlight?: boolean; label?: string }) {
  const t = useT();
  const f = useFormat();
  const medal = e.rank === 1 ? "text-[#FFC93C]" : e.rank === 2 ? "text-[#C9D1CC]" : e.rank === 3 ? "text-[#D08A4E]" : "";
  return (
    <div className="grid grid-cols-[48px_1fr_auto] items-center gap-3 md:grid-cols-[64px_1fr_80px_110px_90px_90px]">
      <span className={cx("flex items-center gap-1 font-mono text-lg font-bold", medal)}>
        {e.rank <= 3 ? (e.rank === 1 ? <Crown className="h-5 w-5" aria-hidden /> : <Medal className="h-5 w-5" aria-hidden />) : null}
        {e.rank}
      </span>
      <Link href={routes.profile(e.username)} className="flex min-w-0 items-center gap-3 hover:text-primary">
        <Avatar user={e} size={36} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{e.displayName} {label && <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">{label}</span>}</span>
          <span className="block truncate font-mono text-xs text-text-muted">@{e.username}</span>
        </span>
      </Link>
      <span className="hidden font-mono text-sm md:block">{t.leaderboard.levelShort(e.level)}</span>
      <span className={cx("font-mono text-sm font-bold", highlight ? "text-primary" : "text-text")}>{t.common.xp(f.number(e.xp))}</span>
      <span className="hidden font-mono text-sm text-text-secondary md:block">{e.questions}</span>
      <span className="hidden font-mono text-sm text-text-secondary md:block">{Math.round(e.accuracy)}%</span>
    </div>
  );
}
