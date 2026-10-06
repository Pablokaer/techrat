import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import type { AnswerFeedback, AnswerResult } from "@techrat/types";
import { openReference } from "@/lib/links";
import { AppText, Button, Card, XpPill, hitSlop, tints } from "@/components/ui";
import { RichText } from "./RichText";

/** Graded result: icon + text verdict (never color only), XP, explanation, rewards and "Learn more". */
export function FeedbackPanel({ feedback, result, isLast, onNext }: {
  feedback: AnswerFeedback;
  result?: AnswerResult;
  isLast: boolean;
  onNext: () => void;
}) {
  const ok = feedback.isCorrect;
  const rewards = rewardLines(result);
  return (
    <Card style={[styles.card, { borderColor: ok ? colors.primary : colors.error }]}>
      <View style={styles.header} accessibilityRole="alert" accessibilityLiveRegion="assertive">
        <View style={[styles.icon, { backgroundColor: ok ? tints.primary : tints.error }]}>
          <Ionicons name={ok ? "checkmark" : "close"} size={26} color={ok ? colors.primary : colors.error} />
        </View>
        <View style={styles.verdict}>
          <AppText variant="heading" tone={ok ? "primary" : "error"} testID="feedback-verdict">{ok ? "Correct!" : "Incorrect"}</AppText>
          {feedback.xpEarned > 0 ? (
            <XpPill xp={feedback.xpEarned} prefix="+" />
          ) : (
            ok && <AppText variant="caption" tone="muted">XP already earned for this question</AppText>
          )}
        </View>
      </View>

      <RichText text={feedback.explanation} style={styles.explanation} />

      {rewards.map((r) => (
        <View key={r} style={styles.reward}>
          <Ionicons name="trophy-outline" size={16} color={colors.primary} />
          <AppText variant="caption" tone="primary">{r}</AppText>
        </View>
      ))}

      {!!feedback.referenceUrl && (
        <Pressable
          onPress={() => void openReference(feedback.referenceUrl)}
          accessibilityRole="link"
          accessibilityLabel="Learn more"
          accessibilityHint="Opens the official documentation in a browser"
          hitSlop={hitSlop}
          style={styles.link}
        >
          <Ionicons name="book-outline" size={16} color={colors.primary} />
          <AppText variant="caption" tone="primary" style={styles.linkText}>Learn more</AppText>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </Pressable>
      )}

      <Button label={isLast ? "See results" : "Next question"} icon="arrow-forward" onPress={onNext} testID="next-button" />
    </Card>
  );
}

function rewardLines(r?: AnswerResult): string[] {
  if (!r) return [];
  const lines: string[] = [];
  if (r.bonusXp > 0) lines.push(`Bonus +${r.bonusXp} XP${r.streakIncreased ? " · streak extended" : ""}`);
  if (r.leveledUp) lines.push(`Level up! You reached level ${r.level.level}`);
  if (r.topicLeveledUp) lines.push(`Topic level ${r.topicLevel} unlocked`);
  for (const s of r.completedSteps) lines.push(`Roadmap step completed: ${s.stepTitle} (+${s.xpEarned} XP)`);
  if (r.dailyChallengeBonusXp > 0) lines.push(`Daily challenge complete! +${r.dailyChallengeBonusXp} bonus XP`);
  return lines;
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  verdict: { flex: 1, gap: 4 },
  explanation: { color: colors.textSecondary },
  reward: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  link: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: spacing.xs },
  linkText: { fontWeight: "700" },
});
