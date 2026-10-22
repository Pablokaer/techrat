"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Code2, Flame, Hexagon, Sparkles, Star, Target, Trophy, Zap } from "lucide-react";
import { Card, DifficultyBadge, ProgressBar, TierDot } from "@techrat/ui";
import { api, unwrap } from "@/lib/api";
import { useDashboard } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { TopicIcon } from "@/components/icons";
import { ErrorState, RoadmapChain, SectionHeader, Skeleton, StatCard, TopicCard } from "@/components/widgets";
import { useToast } from "@/components/providers";
import { useFormat, useT } from "@/i18n";

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const f = useFormat();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (error || !data) return <ErrorState error={error} retry={() => refetch()} />;

  const { user, continueLearning, currentRoadmap, currentRoadmapSteps, recommended, dailyChallenge, recentAchievements } = data;

  async function startDaily() {
    try {
      const s = await unwrap(api.POST("/api/v1/daily-challenge/start"));
      router.push(routes.session(s.id));
    } catch {
      toast({ kind: "error", title: t.dashboard.daily.startError });
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Card className="matrix-bg relative overflow-hidden p-6 sm:p-8">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_auto]">
          <div>
            <p className="eyebrow">{t.dashboard.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
              {t.dashboard.greeting[greetingKey()]},<br />
              <span className="text-text">{user.displayName}!</span> <span aria-hidden>👋</span>
            </h1>
            <p className="mt-3 text-text-secondary">{t.dashboard.tagline}</p>
          </div>
          <Image src="/brand/rat.png" alt="" width={220} height={220} priority className="hidden h-44 w-44 drop-shadow-[0_0_30px_rgba(0,255,65,0.35)] lg:block" />
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-bg/60 p-5 sm:min-w-80">
            <div className="text-center">
              <Flame className="mx-auto h-8 w-8 text-warning" aria-hidden />
              <p className="mt-1 font-mono text-3xl font-bold">{user.currentStreak}</p>
              <p className="text-sm text-text-secondary">{t.dashboard.dayStreak}</p>
            </div>
            <div className="border-l border-border pl-4">
              <div className="flex items-center gap-2">
                <Hexagon className="h-8 w-8 text-primary" aria-hidden />
                <p className="text-xl font-bold">{t.common.level(user.level.level)}</p>
              </div>
              <ProgressBar className="mt-3" value={user.level.progressPercent} label={t.dashboard.levelProgress} />
              <p className="mt-2 font-mono text-xs text-text-secondary">
                {t.dashboard.xpProgress(f.number(user.level.xpIntoLevel), f.number(user.level.xpForThisLevel))}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Star} value={f.number(user.level.totalXp)} label={t.dashboard.stats.totalXp} href="/analytics" />
        <StatCard icon={Code2} value={user.questionsAnswered} label={t.dashboard.stats.questionsSolved} href="/analytics" />
        <StatCard icon={Target} value={`${Math.round(user.accuracy)}%`} label={t.dashboard.stats.accuracy} href="/analytics" />
        <StatCard icon={Trophy} value={user.showOnLeaderboard ? `#${user.globalRank}` : "—"} label={t.dashboard.stats.globalRank} tone="warning" href="/leaderboard" />
      </div>

      {/* Continue learning */}
      <section>
        <SectionHeader title={t.dashboard.continueLearning.title} href="/learn" cta={t.dashboard.continueLearning.cta} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {continueLearning.map((topic, i) => <TopicCard key={topic.topicSlug} topic={topic} emphasise={i === 0 && topic.questionsAnswered > 0} />)}
        </div>
      </section>

      {/* Roadmap */}
      <section>
        <SectionHeader title={t.dashboard.roadmap.title} href={currentRoadmap ? routes.roadmap(currentRoadmap.slug) : "/roadmaps"} cta={currentRoadmap ? t.dashboard.roadmap.viewFull : t.dashboard.roadmap.choose} />
        {currentRoadmap ? (
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{currentRoadmap.name}</p>
                <p className="text-sm text-text-secondary">{t.dashboard.roadmap.progress(currentRoadmap.completedSteps, currentRoadmap.stepsCount, Math.round(currentRoadmap.percentComplete))}</p>
              </div>
              <ProgressBar value={currentRoadmap.percentComplete} className="max-w-xs" label={t.dashboard.roadmap.progressLabel} />
            </div>
            <RoadmapChain steps={currentRoadmapSteps} roadmapSlug={currentRoadmap.slug} />
          </Card>
        ) : (
          <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{t.dashboard.roadmap.emptyTitle}</p>
              <p className="text-sm text-text-secondary">{t.dashboard.roadmap.emptyText}</p>
            </div>
            <Link href="/roadmaps" className="btn-primary">{t.dashboard.roadmap.browse}</Link>
          </Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recommended */}
        <section className="lg:col-span-1">
          <SectionHeader title={t.dashboard.recommended.title} />
          <Card className="divide-y divide-border-subtle">
            {recommended.map((r) => (
              <Link key={`${r.kind}-${r.topicSlug}-${r.title}`} href={routes.practice({ topic: r.topicSlug, subtopic: r.subtopicSlug ?? undefined, difficulty: r.difficulty ?? undefined })}
                className="flex items-center gap-3 p-4 hover:bg-white/[0.03]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {r.kind === "Challenge" ? <Zap className="h-5 w-5" aria-hidden /> : <TopicIcon name="target" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className="block truncate text-xs text-text-secondary">{r.reason}</span>
                </span>
                {r.difficulty && <DifficultyBadge difficulty={r.difficulty} label={t.common.difficulty[r.difficulty] ?? r.difficulty} />}
              </Link>
            ))}
          </Card>
        </section>

        {/* Daily challenge */}
        <section>
          <SectionHeader title={t.dashboard.daily.title} />
          <Card className="matrix-bg flex h-[calc(100%-2.25rem)] flex-col justify-between p-5">
            <div>
              <CalendarCheck className="h-8 w-8 text-primary" aria-hidden />
              <p className="mt-3 text-lg font-bold">{t.dashboard.daily.questions(dailyChallenge.questionsCount)}</p>
              <p className="text-sm text-text-secondary">{t.dashboard.daily.descriptionBefore}<span className="font-mono text-primary">{t.common.plusXp(dailyChallenge.bonusXp)}</span>{t.dashboard.daily.descriptionAfter}</p>
              {dailyChallenge.sessionId && !dailyChallenge.completed && (
                <ProgressBar className="mt-4" value={(dailyChallenge.answeredCount / dailyChallenge.questionsCount) * 100} label={t.dashboard.daily.progressLabel} />
              )}
            </div>
            {dailyChallenge.completed ? (
              <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> {t.dashboard.daily.completedToday(dailyChallenge.correctCount, dailyChallenge.questionsCount)}</p>
            ) : (
              <button onClick={startDaily} className="btn-primary mt-5 w-full">{dailyChallenge.sessionId ? t.dashboard.daily.resume : t.dashboard.daily.start}</button>
            )}
          </Card>
        </section>

        {/* Achievements */}
        <section>
          <SectionHeader title={t.dashboard.achievements.title} href="/profile?tab=achievements" />
          <Card className="divide-y divide-border-subtle">
            {recentAchievements.length === 0 && <p className="p-5 text-sm text-text-secondary">{t.dashboard.achievements.empty}</p>}
            {recentAchievements.map((a) => (
              <div key={a.code} className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><TopicIcon name={a.icon} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-text-secondary"><TierDot tier={a.tier} /> {t.common.tier[a.tier] ?? a.tier} · {t.common.plusXp(a.xpReward)}</span>
                </span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
