import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import type { AnswerFeedback, PracticeSession } from "@techrat/types";
import { sessionStats } from "@/lib/format";
import { AppText, Button, Card, DifficultyBadge, Divider, tints } from "@/components/ui";

export function SessionSummary({ session, answers, onPracticeAgain, onDone, restarting }: {
  session: PracticeSession;
  answers: Record<string, AnswerFeedback | null | undefined>;
  onPracticeAgain?: () => void;
  onDone: () => void;
  restarting?: boolean;
}) {
  const stats = sessionStats(session.questions.map((q) => answers[q.id]));
  return (
    <View style={styles.wrap}>
      <Card highlighted style={styles.hero}>
        <Ionicons name="ribbon-outline" size={44} color={colors.primary} />
        <AppText variant="title" accessibilityRole="header">Session complete</AppText>
        <AppText tone="secondary">{session.topicName ?? (session.isDailyChallenge ? "Daily Challenge" : "Mixed topics")}</AppText>
        <View style={styles.stats}>
          <Stat label="Correct" value={`${stats.correct}/${stats.answered}`} />
          <Stat label="Accuracy" value={`${stats.accuracy}%`} />
          <Stat label="XP earned" value={`+${stats.xp}`} primary />
        </View>
        {onPracticeAgain && !session.isDailyChallenge && (
          <Button label="Practice again" icon="refresh" onPress={onPracticeAgain} loading={restarting} style={styles.full} />
        )}
        <Button label="Back to home" variant="secondary" onPress={onDone} style={styles.full} />
      </Card>

      <Card>
        <AppText variant="heading" accessibilityRole="header">Review</AppText>
        {session.questions.map((q, i) => {
          const a = answers[q.id];
          return (
            <View key={q.id}>
              {i > 0 && <Divider />}
              <View style={styles.reviewRow} accessible accessibilityLabel={`Question ${i + 1}, ${q.title}: ${a?.isCorrect ? "correct" : "incorrect"}`}>
                <View style={[styles.mark, { backgroundColor: a?.isCorrect ? tints.primary : tints.error }]}>
                  <Ionicons name={a?.isCorrect ? "checkmark" : "close"} size={16} color={a?.isCorrect ? colors.primary : colors.error} />
                </View>
                <View style={styles.reviewBody}>
                  <AppText variant="subheading">{i + 1}. {q.title}</AppText>
                  <AppText variant="caption" tone="secondary">Answer: {q.options.find((o) => o.id === a?.correctOptionId)?.text ?? "—"}</AppText>
                </View>
                <DifficultyBadge difficulty={q.difficulty} />
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText variant="mono" tone={primary ? "primary" : "default"} style={styles.statValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  hero: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  stats: { flexDirection: "row", gap: spacing.lg, marginVertical: spacing.md },
  stat: { alignItems: "center", minWidth: 80 },
  statValue: { fontSize: 24 },
  full: { alignSelf: "stretch" },
  reviewRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.md },
  mark: { width: 28, height: 28, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  reviewBody: { flex: 1, gap: 2 },
});
