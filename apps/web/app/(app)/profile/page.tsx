"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Code2, Flame, Hexagon, Lock, Pencil, Star, Target, Trophy } from "lucide-react";
import { Card, ProgressBar, TierDot, cx } from "@techrat/ui";
import { tierColors } from "@techrat/theme";
import { useMe, useProfile } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { AccuracyByDifficultyChart, ActivityChart } from "@/components/charts";
import { TopicIcon } from "@/components/icons";
import { Avatar } from "@/components/shell";
import { ErrorState, Skeleton, StatCard, Tabs } from "@/components/widgets";
import { useFormat, useT } from "@/i18n";

type Tab = "overview" | "topics" | "statistics" | "achievements";

function ProfileView() {
  const params = useSearchParams();
  const { data: me } = useMe();
  const username = params.get("u") ?? me?.username ?? "";
  const { data, isLoading, error } = useProfile(username);
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "overview");
  const t = useT();
  const f = useFormat();

  if (isLoading || !username) return <Skeleton className="h-96" />;
  if (error || !data) return <ErrorState error={error ?? new Error(t.profile.notFound)} />;
  const { user } = data;
  const isMe = me?.id === user.id;
  const unlocked = data.achievements.filter((a) => a.unlocked);

  return (
    <div className="space-y-6">
      <Card className="matrix-bg p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="self-center rounded-full p-1 shadow-[0_0_30px_rgba(0,255,65,0.35)] md:self-auto"><Avatar user={user} size={112} /></div>
          <div className="min-w-0 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:flex-nowrap md:justify-start">
              <h1 className="min-w-0 break-words text-3xl font-extrabold md:truncate">{user.displayName}</h1>
              {isMe && <Link href="/settings" className="btn-ghost px-2 py-1 text-xs"><Pencil className="h-3.5 w-3.5" /> {t.profile.edit}</Link>}
            </div>
            <p className="font-mono text-sm text-text-secondary">@{user.username}</p>
            {user.bio && <p className="mx-auto mt-2 max-w-xl text-text-secondary md:mx-0">{user.bio}</p>}
            <p className="mt-2 text-xs text-text-muted">{t.profile.memberSince(f.date(user.createdAt, { month: "long", year: "numeric" }))}</p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-bg/60 p-5 md:min-w-72">
            <Hexagon className="h-14 w-14 text-primary" aria-hidden />
            <div className="flex-1">
              <p className="text-2xl font-bold">{t.common.level(user.level.level)}</p>
              <p className="font-mono text-sm text-text-secondary">{t.profile.xpProgress(user.level.xpIntoLevel, user.level.xpForThisLevel)}</p>
              <ProgressBar className="mt-2" value={user.level.progressPercent} label={t.profile.levelProgress} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Star} value={f.number(user.level.totalXp)} label={t.profile.stats.totalXp} />
        <StatCard icon={Code2} value={user.questionsAnswered} label={t.profile.stats.questionsSolved} />
        <StatCard icon={Target} value={`${Math.round(user.accuracy)}%`} label={t.profile.stats.accuracyRate} />
        <StatCard icon={Trophy} value={`#${user.globalRank}`} label={t.profile.stats.globalRank} tone="warning" />
      </div>

      <Tabs<Tab> label={t.profile.tabs.label} value={tab} onChange={setTab} items={[
        { value: "overview", label: t.profile.tabs.overview }, { value: "topics", label: t.profile.tabs.topics },
        { value: "statistics", label: t.profile.tabs.statistics }, { value: "achievements", label: t.profile.tabs.achievements(unlocked.length) },
      ]} />

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h2 className="font-semibold">{t.profile.accuracyByDifficulty}</h2>
            <AccuracyByDifficultyChart data={data.accuracyByDifficulty} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">{t.profile.topicLevels}</h2>
            <TopicLevels topics={data.topicProgress.slice(0, 6)} />
            {data.topicProgress.length > 6 && <button onClick={() => setTab("topics")} className="mt-3 text-sm text-primary hover:underline">{t.profile.viewAll}</button>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">{t.profile.earnedBadges}</h2>
            <Badges items={unlocked.slice(0, 6)} />
            {unlocked.length === 0 && <p className="text-sm text-text-secondary">{t.profile.noBadges}</p>}
          </Card>
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-semibold">{t.profile.activity}</h2>
            <ActivityChart data={data.activity} dataKey="questions" label={t.profile.chartQuestions} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">{t.profile.strengthsWeaknesses}</h2>
            <p className="text-xs uppercase tracking-wider text-text-muted">{t.profile.strongest}</p>
            <ul className="mb-4 mt-2 space-y-1.5 text-sm">{data.strongestTopics.map((topic) => <li key={topic.topicSlug} className="flex justify-between"><span>{topic.topicName}</span><span className="font-mono text-primary">{Math.round(topic.accuracy)}%</span></li>)}{data.strongestTopics.length === 0 && <li className="text-text-secondary">{t.profile.notEnoughData}</li>}</ul>
            <p className="text-xs uppercase tracking-wider text-text-muted">{t.profile.needsWork}</p>
            <ul className="mt-2 space-y-1.5 text-sm">{data.weakestTopics.map((topic) => <li key={topic.topicSlug} className="flex justify-between"><span>{topic.topicName}</span><span className="font-mono text-error">{Math.round(topic.accuracy)}%</span></li>)}{data.weakestTopics.length === 0 && <li className="text-text-secondary">{t.profile.notEnoughData}</li>}</ul>
          </Card>
        </div>
      )}

      {tab === "topics" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">{t.profile.levelsPerTopic}</h2>
            <TopicLevels topics={data.topicProgress} />
            {data.topicProgress.length === 0 && <p className="text-sm text-text-secondary">{t.profile.topicsEmpty}</p>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">{t.profile.roadmaps}</h2>
            <ul className="space-y-3">
              {data.roadmaps.length === 0 && <li className="text-sm text-text-secondary">{t.profile.noRoadmaps}</li>}
              {data.roadmaps.map((r) => (
                <li key={r.slug}>
                  <Link href={routes.roadmap(r.slug)} className="block rounded-xl bg-bg-2 p-4 hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between text-sm"><span className="font-semibold">{r.name}</span><span className="font-mono">{Math.round(r.percentComplete)}%</span></div>
                    <ProgressBar className="mt-2" size="sm" value={r.percentComplete} label={t.profile.progressOf(r.name)} />
                    <p className="mt-1.5 text-xs text-text-secondary">{r.isCompleted ? t.profile.completed : r.currentStepTitle ? t.profile.nextStep(r.currentStepTitle) : ""}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "statistics" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5"><h2 className="font-semibold">{t.profile.accuracyByDifficulty}</h2><AccuracyByDifficultyChart data={data.accuracyByDifficulty} /></Card>
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">{t.profile.answersByDifficulty}</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-text-muted"><tr><th className="pb-2 font-medium">{t.profile.table.difficulty}</th><th className="pb-2 font-medium">{t.profile.table.answered}</th><th className="pb-2 font-medium">{t.profile.table.correct}</th><th className="pb-2 font-medium">{t.profile.table.accuracy}</th></tr></thead>
              <tbody>{data.accuracyByDifficulty.map((d) => <tr key={d.difficulty} className="border-t border-border-subtle"><td className="py-2">{t.common.difficulty[d.difficulty] ?? d.difficulty}</td><td className="font-mono">{d.answered}</td><td className="font-mono">{d.correct}</td><td className="font-mono">{Math.round(d.accuracy)}%</td></tr>)}</tbody>
            </table>
            <div className="mt-6 flex items-center gap-2 text-sm text-text-secondary"><Flame className="h-4 w-4 text-warning" aria-hidden /> {t.profile.streakSummary(user.currentStreak, user.longestStreak)}</div>
          </Card>
          <Card className="p-5 lg:col-span-2"><h2 className="font-semibold">{t.profile.xpPerDay}</h2><ActivityChart data={data.activity} dataKey="xpEarned" label={t.profile.chartXp} /></Card>
        </div>
      )}

      {tab === "achievements" && (
        <Card className="p-5">
          <Badges items={data.achievements} showLocked />
        </Card>
      )}
    </div>
  );
}

function TopicLevels({ topics }: { topics: NonNullable<ReturnType<typeof useProfile>["data"]>["topicProgress"] }) {
  const t = useT();
  return (
    <ul className="space-y-3">
      {topics.map((topic) => (
        <li key={topic.topicSlug} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
          <TopicIcon name={topic.icon} className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <div className="flex items-center justify-between text-sm"><Link href={routes.topic(topic.topicSlug)} className="truncate hover:text-primary">{topic.topicName}</Link></div>
            <ProgressBar className="mt-1.5" size="sm" value={topic.level.progressPercent} label={t.profile.levelProgressOf(topic.topicName)} />
          </div>
          <span className="rounded-full border border-primary/40 px-2 py-0.5 font-mono text-xs text-primary">{t.profile.levelShort(topic.level.level)}</span>
        </li>
      ))}
    </ul>
  );
}

function Badges({ items, showLocked = false }: { items: NonNullable<ReturnType<typeof useProfile>["data"]>["achievements"]; showLocked?: boolean }) {
  const t = useT();
  return (
    <ul className={cx("grid gap-3", showLocked ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
      {items.map((a) => {
        const color = tierColors[a.tier as keyof typeof tierColors];
        return (
          <li key={a.code} className={cx("rounded-2xl border bg-bg-2 p-4 text-center", a.unlocked ? "border-border" : "border-border-subtle opacity-50")}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ color: a.unlocked ? color : undefined, backgroundColor: a.unlocked ? `${color}1A` : "rgba(255,255,255,0.04)" }}>
              {a.unlocked ? <TopicIcon name={a.icon} className="h-6 w-6" /> : <Lock className="h-5 w-5 text-text-muted" aria-hidden />}
            </span>
            <p className="mt-2 text-sm font-semibold">{a.name}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{a.description}</p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-text-muted"><TierDot tier={a.tier} /> {t.common.tier[a.tier] ?? a.tier} · {t.common.plusXp(a.xpReward)}</p>
            {!a.unlocked && <span className="sr-only">{t.profile.locked}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export default function ProfilePage() {
  return <Suspense><ProfileView /></Suspense>;
}
