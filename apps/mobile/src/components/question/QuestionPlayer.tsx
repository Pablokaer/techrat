import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@techrat/api";
import type { AnswerFeedback, AnswerResult, PracticeSession, UserSummary } from "@techrat/types";
import { useApi } from "@/lib/api-context";
import { OPTION_LETTERS } from "@/lib/format";
import { invalidateProgress, qk } from "@/lib/queries";
import { AppText, Button, Card, DifficultyBadge, XpPill, errorMessage } from "@/components/ui";
import { spacing } from "@techrat/theme";
import { FeedbackPanel } from "./FeedbackPanel";
import { OptionItem, type OptionState } from "./OptionItem";
import { RichText } from "./RichText";
import { SessionHeader } from "./SessionHeader";
import { SessionSummary } from "./SessionSummary";
import { useTimer } from "./useTimer";

export interface QuestionPlayerProps {
  session: PracticeSession;
  onExit: () => void;
  onPracticeAgain?: () => void;
  restarting?: boolean;
}

export function QuestionPlayer({ session, onExit, onPracticeAgain, restarting }: QuestionPlayerProps) {
  const api = useApi();
  const qc = useQueryClient();
  const firstUnanswered = session.questions.findIndex((q) => !q.answer);
  const [index, setIndex] = useState(firstUnanswered === -1 ? session.questions.length : firstUnanswered);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerFeedback | null>>(() =>
    Object.fromEntries(session.questions.map((q) => [q.id, q.answer])),
  );
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const question = session.questions[index];
  const feedback = question ? answers[question.id] : null;
  const seconds = useTimer(!!question && !feedback, question?.id ?? "done");

  const submit = useCallback(async () => {
    if (!question || !selected || feedback || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await unwrap(
        api.POST("/api/v1/practice/sessions/{id}/answers", {
          params: { path: { id: session.id } },
          body: { questionId: question.id, selectedOptionId: selected, timeSpentSeconds: seconds },
        }),
      );
      setResults((m) => ({ ...m, [question.id]: r }));
      setAnswers((m) => ({ ...m, [question.id]: r.feedback }));
      qc.setQueryData<UserSummary>(qk.me, (old) => (old ? { ...old, level: r.level, currentStreak: r.currentStreak } : old));
    } catch (e) {
      setSubmitError(errorMessage(e, "Could not submit your answer"));
    } finally {
      setSubmitting(false);
    }
  }, [api, qc, question, selected, feedback, submitting, seconds, session.id]);

  const next = useCallback(() => {
    setSelected(null);
    setIndex((i) => i + 1);
    if (index + 1 >= session.questions.length) invalidateProgress(qc);
  }, [index, session.questions.length, qc]);

  if (!question) {
    return <SessionSummary session={session} answers={answers} onDone={onExit} onPracticeAgain={onPracticeAgain} restarting={restarting} />;
  }

  const crumbs = [session.isDailyChallenge ? "Daily Challenge" : session.mode === "Roadmap" ? "Roadmap" : "Practice", question.topicName, question.subtopicName].filter(Boolean);

  return (
    <View style={styles.wrap}>
      <SessionHeader crumbs={crumbs} index={index} total={session.totalQuestions} questions={session.questions} answers={answers} seconds={seconds} />

      <Card style={styles.card}>
        <View style={styles.badges}>
          <DifficultyBadge difficulty={question.difficulty} />
          <XpPill xp={question.xpReward} />
        </View>
        <AppText variant="caption" tone="muted">{question.title}</AppText>
        <RichText text={question.questionText} style={styles.question} />

        <View accessibilityRole="radiogroup" accessibilityLabel="Answer options" style={styles.options}>
          {question.options.map((o, i) => {
            const picked = (feedback?.selectedOptionId ?? selected) === o.id;
            return (
              <OptionItem
                key={o.id}
                letter={OPTION_LETTERS[i] ?? String(i + 1)}
                text={o.text}
                state={optionState(o.id, picked, feedback)}
                checked={picked}
                locked={!!feedback || submitting}
                onPress={() => setSelected(o.id)}
              />
            );
          })}
        </View>

        {submitError && <AppText tone="error" accessibilityRole="alert">{submitError}</AppText>}
        {!feedback && (
          <Button
            label={submitting ? "Checking…" : "Submit answer"}
            onPress={() => void submit()}
            disabled={!selected}
            loading={submitting}
            accessibilityHint={selected ? undefined : "Choose an option first"}
            testID="submit-button"
          />
        )}
      </Card>

      {feedback && (
        <FeedbackPanel feedback={feedback} result={results[question.id]} isLast={index + 1 >= session.questions.length} onNext={next} />
      )}
    </View>
  );
}

function optionState(optionId: string, picked: boolean, feedback: AnswerFeedback | null | undefined): OptionState {
  if (!feedback) return picked ? "selected" : "idle";
  if (feedback.correctOptionId === optionId) return "correct";
  return picked ? "wrong" : "dimmed";
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  card: { gap: spacing.md },
  badges: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  question: { fontSize: 17, lineHeight: 25, fontWeight: "600" },
  options: { gap: spacing.sm },
});
