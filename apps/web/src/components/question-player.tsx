"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Check, ChevronRight, Clock, ExternalLink, Flame, Hexagon, PartyPopper, RotateCcw, Target, X } from "lucide-react";
import { Card, DifficultyBadge, ProgressBar, XpPill, cx } from "@techrat/ui";
import type { AnswerResult, PracticeSession, SessionQuestion } from "@techrat/types";
import { isApiError } from "@techrat/api";
import { api, unwrap } from "@/lib/api";
import { invalidateProgress, qk, useMe } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { RichText } from "./question-text";
import { openExternal } from "@/lib/external";
import { useToast } from "./providers";
import { useFormat, useT } from "@/i18n";

const LETTERS = ["A", "B", "C", "D"];

function useTimer(running: boolean, resetKey: string) {
  // Seconds are tied to the question key, so switching question resets the clock without an extra effect.
  const [state, setState] = useState({ key: resetKey, seconds: 0 });
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setState((s) => ({ key: resetKey, seconds: s.key === resetKey ? s.seconds + 1 : 1 })), 1000);
    return () => clearInterval(id);
  }, [running, resetKey]);
  return state.key === resetKey ? state.seconds : 0;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function QuestionPlayer({ session, onSubmitAnswer }: {
  session: PracticeSession;
  /** Injectable for tests. Defaults to the API call. */
  onSubmitAnswer?: (questionId: string, optionId: string, seconds: number) => Promise<AnswerResult>;
}) {
  const t = useT();
  const f = useFormat();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const firstUnanswered = session.questions.findIndex((q) => !q.answer);
  const [index, setIndex] = useState(firstUnanswered === -1 ? session.questions.length : firstUnanswered);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [answers, setAnswers] = useState<Record<string, SessionQuestion["answer"]>>(
    () => Object.fromEntries(session.questions.filter((q) => q.answer).map((q) => [q.id, q.answer])),
  );
  const [submitting, setSubmitting] = useState(false);
  const question = session.questions[index];
  const feedback = question ? answers[question.id] : undefined;
  const result = question ? results[question.id] : undefined;
  const seconds = useTimer(!!question && !feedback, question?.id ?? "done");
  const nextRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLElement>(null);
  const shownIndex = useRef(index);

  // "Next question" swaps the content in place (no navigation), so the browser would keep the previous scroll position,
  // usually down at the feedback. Bring the new question's title under the sticky top bar (or the summary to the top),
  // and move focus there so screen readers start reading the new question.
  useEffect(() => {
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    if (questionRef.current) {
      questionRef.current.scrollIntoView({ block: "start" });
      questionRef.current.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [index]);

  const submit = useCallback(async () => {
    if (!question || !selected || feedback || submitting) return;
    setSubmitting(true);
    try {
      const r = onSubmitAnswer
        ? await onSubmitAnswer(question.id, selected, seconds)
        : await unwrap(api.POST("/api/v1/practice/sessions/{id}/answers", {
            params: { path: { id: session.id } },
            body: { questionId: question.id, selectedOptionId: selected, timeSpentSeconds: seconds },
          }));
      setResults((m) => ({ ...m, [question.id]: r }));
      setAnswers((m) => ({ ...m, [question.id]: r.feedback }));
      qc.setQueryData(qk.me, (old: typeof me) => (old ? { ...old, level: r.level, currentStreak: r.currentStreak } : old));
      if (r.leveledUp) toast({ kind: "achievement", title: t.practice.player.toasts.levelUp(r.level.level) });
      if (r.topicLeveledUp) toast({ kind: "success", title: t.practice.player.toasts.topicLevel(r.topicLevel) });
      r.completedSteps.forEach((s) => toast({ kind: "success", title: t.practice.player.toasts.stepCompleted(s.stepTitle), body: t.practice.player.toasts.stepCompletedBody(s.xpEarned, s.roadmapName, s.moduleName || undefined) }));
      if (r.dailyChallengeBonusXp > 0) toast({ kind: "achievement", title: t.practice.player.toasts.dailyComplete, body: t.practice.player.toasts.dailyBonus(r.dailyChallengeBonusXp) });
      setTimeout(() => nextRef.current?.focus(), 0);
    } catch (e) {
      toast({ kind: "error", title: isApiError(e) ? e.detail ?? e.title : t.practice.player.toasts.submitError });
    } finally {
      setSubmitting(false);
    }
  }, [question, selected, feedback, submitting, onSubmitAnswer, seconds, session.id, qc, toast, t]);

  const next = useCallback(() => {
    setSelected(null);
    setIndex((i) => i + 1);
    if (index + 1 >= session.questions.length) invalidateProgress(qc);
  }, [index, session.questions.length, qc]);

  // Keyboard: 1-4 / A-D select, Enter submits or advances.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!question || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const k = e.key.toUpperCase();
      const i = ["1", "2", "3", "4"].indexOf(k) >= 0 ? Number(k) - 1 : LETTERS.indexOf(k);
      if (i >= 0 && !feedback && question.options[i]) setSelected(question.options[i].id);
      if (e.key === "Enter" && target.tagName !== "BUTTON" && target.tagName !== "A") {
        e.preventDefault();
        if (feedback) next(); else void submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, feedback, submit, next]);

  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a?.isCorrect).length;
  const sessionXp = useMemo(() => Object.values(answers).reduce((s, a) => s + (a?.xpEarned ?? 0), 0), [answers]);
  const crumbs = [t.practice.modes[session.mode] ?? t.practice.modes.Practice, question?.topicName ?? session.topicName, question?.subtopicName].filter(Boolean) as string[];

  if (!question) {
    return <SessionSummary session={session} answered={answeredCount} correct={correctCount} xp={sessionXp} answers={answers} />;
  }

  return (
    <div className="space-y-5">
      {/* Header: breadcrumb, counter, progress, timer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t.practice.player.breadcrumb} className="flex items-center gap-1.5 text-sm text-text-secondary">
          {crumbs.map((c, i) => (
            <span key={`${c}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden />}
              <span className={i === 0 ? "font-semibold text-primary" : ""}>{c}</span>
            </span>
          ))}
        </nav>
        <p className="text-sm text-text-secondary" aria-live="polite">{t.practice.player.questionOf(index + 1, session.totalQuestions)}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {session.questions.map((q, i) => {
            const a = answers[q.id];
            return <span key={q.id} className={cx("h-2 flex-1 rounded-full", a ? (a.isCorrect ? "bg-primary shadow-glow-sm" : "bg-error") : i === index ? "bg-primary/40" : "bg-white/[0.07]")} />;
          })}
        </div>
        <span className="flex items-center gap-1.5 font-mono text-lg font-semibold" aria-label={t.practice.player.timeOnQuestion(mmss(seconds))}>
          <Clock className="h-5 w-5 text-warning" aria-hidden /> {mmss(seconds)}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Question, then its feedback: on phones the side panel stacks below both. */}
        <div className="min-w-0 space-y-5">
          <section ref={questionRef} tabIndex={-1} aria-label={t.practice.player.questionOf(index + 1, session.totalQuestions)} className="scroll-mt-20 outline-none">
            <Card className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={question.difficulty} label={t.common.difficulty[question.difficulty] ?? question.difficulty} />
                <XpPill xp={question.xpReward} />
                <span className="ml-auto text-xs text-text-muted">{question.title}</span>
              </div>
              <RichText text={question.questionText} className="mt-5 text-lg font-semibold leading-relaxed sm:text-xl" />

              <div role="radiogroup" aria-label={t.practice.player.answerOptions} className="mt-6 space-y-3">
                {question.options.map((o, i) => {
                  const isSelected = (feedback?.selectedOptionId ?? selected) === o.id;
                  const isCorrect = feedback?.correctOptionId === o.id;
                  const isWrongPick = !!feedback && isSelected && !isCorrect;
                  return (
                    <button
                      key={o.id}
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!!feedback}
                      onClick={() => setSelected(o.id)}
                      className={cx(
                        "flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors disabled:cursor-default",
                        !feedback && (isSelected ? "glow-border bg-primary/10" : "border-border bg-bg-2 hover:border-primary/40"),
                        isCorrect && "glow-border bg-primary/10",
                        isWrongPick && "border-error/70 bg-error/10",
                        feedback && !isCorrect && !isWrongPick && "border-border bg-bg-2 opacity-60",
                      )}
                    >
                      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold",
                        isCorrect ? "bg-primary text-on-primary" : isWrongPick ? "bg-error text-white" : isSelected ? "bg-primary/80 text-on-primary" : "bg-white/10")}>
                        {LETTERS[i]}
                      </span>
                      <span className="flex-1 text-[15px]"><RichText text={o.text} /></span>
                      {isCorrect && <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Check className="h-5 w-5" aria-hidden /> {t.practice.player.correctAnswer}</span>}
                      {isWrongPick && <span className="flex items-center gap-1 text-xs font-semibold text-error"><X className="h-5 w-5" aria-hidden /> {t.practice.player.yourAnswer}</span>}
                    </button>
                  );
                })}
              </div>

              {!feedback && (
                <div className="mt-6 flex items-center justify-between gap-3">
                  <p className="hidden text-xs text-text-muted sm:block">{t.practice.player.tip}</p>
                  <button onClick={submit} disabled={!selected || submitting} className="btn-primary w-full px-6 sm:w-auto">{submitting ? t.practice.player.checking : t.practice.player.submit}</button>
                </div>
              )}
            </Card>
          </section>
          {feedback && (
            <Card className={cx("animate-pop p-5 sm:p-6", feedback.isCorrect ? "glow-border" : "border-error/50")}>
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <span className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", feedback.isCorrect ? "bg-primary/15 text-primary" : "bg-error/15 text-error")}>
                  {feedback.isCorrect ? <Check className="h-7 w-7" aria-hidden /> : <X className="h-7 w-7" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1" role="status" aria-live="assertive">
                  <p className={cx("text-xl font-bold", feedback.isCorrect ? "text-primary" : "text-error")}>
                    {feedback.isCorrect ? t.practice.player.correctFeedback : t.practice.player.incorrect}
                    {feedback.xpEarned > 0 && <span className="ml-3 align-middle font-mono text-sm text-primary">{t.common.plusXp(feedback.xpEarned)}</span>}
                    {feedback.isCorrect && feedback.xpEarned === 0 && <span className="ml-3 align-middle text-xs font-normal text-text-muted">{t.practice.player.xpAlreadyEarned}</span>}
                  </p>
                  <RichText text={feedback.explanation} className="mt-2 space-y-2 leading-relaxed text-text-secondary" />
                  {result && result.bonusXp > 0 && <p className="mt-2 text-sm text-primary">{t.practice.player.bonus(result.bonusXp)} {result.streakIncreased ? t.practice.player.streakExtended : ""}</p>}
                  {feedback.referenceUrl && (
                    <a href={feedback.referenceUrl} target="_blank" rel="noopener noreferrer" onClick={openExternal} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                      <BookOpen className="h-4 w-4" aria-hidden /> {t.practice.player.learnMore} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only">{t.practice.player.opensDocs}</span>
                    </a>
                  )}
                </div>
                <button ref={nextRef} onClick={next} className="btn-primary shrink-0 px-6 py-3 text-base">
                  {index + 1 >= session.questions.length ? t.practice.player.seeResults : t.practice.player.nextQuestion} <ArrowRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </Card>
          )}
        </div>

        {/* Side panel */}
        <aside className="space-y-4">
          <Card className="p-5">
            <p className="eyebrow">{t.practice.player.session}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-text-muted">{t.practice.player.answered}</dt><dd className="font-mono text-lg font-bold">{answeredCount}/{session.totalQuestions}</dd></div>
              <div><dt className="text-text-muted">{t.practice.player.correct}</dt><dd className="font-mono text-lg font-bold text-primary">{correctCount}</dd></div>
              <div><dt className="text-text-muted">{t.practice.player.sessionXp}</dt><dd className="font-mono text-lg font-bold">+{sessionXp}</dd></div>
              <div><dt className="text-text-muted">{t.practice.player.streak}</dt><dd className="flex items-center gap-1 font-mono text-lg font-bold"><Flame className="h-4 w-4 text-warning" aria-hidden />{me?.currentStreak ?? 0}</dd></div>
            </dl>
          </Card>
          {me && (
            <Card className="p-5">
              <div className="flex items-center gap-2"><Hexagon className="h-5 w-5 text-primary" aria-hidden /><p className="font-semibold">{t.common.level(me.level.level)}</p></div>
              <ProgressBar className="mt-3" value={me.level.progressPercent} label={t.practice.player.levelProgress} />
              <p className="mt-2 font-mono text-xs text-text-secondary">{t.practice.player.toNextLevel(f.number(me.level.totalXp), me.level.xpToNextLevel)}</p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function SessionSummary({ session, answered, correct, xp, answers }: {
  session: PracticeSession; answered: number; correct: number; xp: number; answers: Record<string, SessionQuestion["answer"]>;
}) {
  const t = useT();
  const accuracy = answered ? Math.round((100 * correct) / answered) : 0;
  // Learn sessions go back to the topic's question list; the others start a similar session.
  const learn = session.mode === "Learn";
  const again = learn ? (session.topicSlug ? routes.topic(session.topicSlug) : "/learn") : routes.practice({ topic: session.topicSlug ?? undefined, subtopic: session.subtopicSlug ?? undefined, difficulty: session.difficulty ?? undefined, mode: session.mode });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="matrix-bg p-8 text-center">
        <PartyPopper className="mx-auto h-12 w-12 text-primary" aria-hidden />
        <h1 className="mt-4 text-3xl font-extrabold">{t.practice.summary.title}</h1>
        <p className="mt-2 text-text-secondary">{session.topicName ?? (session.isDailyChallenge ? t.practice.modes.DailyChallenge : t.practice.summary.mixedTopics)}</p>
        <dl className="mt-8 grid grid-cols-3 gap-4">
          <div><dt className="text-sm text-text-muted">{t.practice.summary.correct}</dt><dd className="font-mono text-3xl font-bold">{correct}/{answered}</dd></div>
          <div><dt className="text-sm text-text-muted">{t.practice.summary.accuracy}</dt><dd className="font-mono text-3xl font-bold">{accuracy}%</dd></div>
          <div><dt className="text-sm text-text-muted">{t.practice.summary.xpEarned}</dt><dd className="font-mono text-3xl font-bold text-primary">+{xp}</dd></div>
        </dl>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!session.isDailyChallenge && <Link href={again} className="btn-primary"><RotateCcw className="h-4 w-4" /> {learn ? t.practice.summary.pickMore : t.practice.summary.practiceAgain}</Link>}
          <Link href="/dashboard" className="btn-secondary">{t.practice.summary.backToDashboard}</Link>
          <Link href="/analytics" className="btn-ghost"><Target className="h-4 w-4" /> {t.practice.summary.viewAnalytics}</Link>
        </div>
      </Card>
      <Card className="divide-y divide-border-subtle">
        <h2 className="p-5 font-semibold">{t.practice.summary.review}</h2>
        {session.questions.map((q, i) => {
          const a = answers[q.id];
          return (
            <div key={q.id} className="flex items-start gap-3 p-5">
              <span className={cx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", a?.isCorrect ? "bg-primary/15 text-primary" : "bg-error/15 text-error")}>
                {a?.isCorrect ? <Check className="h-4 w-4" aria-label={t.practice.summary.correct} /> : <X className="h-4 w-4" aria-label={t.practice.summary.incorrect} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{i + 1}. {q.title}</p>
                <p className="mt-1 text-sm text-text-secondary">{t.practice.summary.answer(q.options.find((o) => o.id === a?.correctOptionId)?.text ?? "")}</p>
                {a?.referenceUrl && <a href={a.referenceUrl} target="_blank" rel="noopener noreferrer" onClick={openExternal} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">{t.practice.summary.learnMore} <ExternalLink className="h-3 w-3" aria-hidden /></a>}
              </div>
              <DifficultyBadge difficulty={q.difficulty} label={t.common.difficulty[q.difficulty] ?? q.difficulty} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}
