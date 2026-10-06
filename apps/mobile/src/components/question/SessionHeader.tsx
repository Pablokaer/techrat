import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import type { AnswerFeedback, SessionQuestion } from "@techrat/types";
import { mmss } from "@/lib/format";
import { AppText, tints } from "@/components/ui";

export function SessionHeader({ crumbs, index, total, questions, answers, seconds }: {
  crumbs: string[];
  index: number;
  total: number;
  questions: SessionQuestion[];
  answers: Record<string, AnswerFeedback | null | undefined>;
  seconds: number;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.crumbs} accessibilityRole="text" accessibilityLabel={crumbs.join(", ")}>
        {crumbs.map((c, i) => (
          <View key={`${c}-${i}`} style={styles.crumb}>
            {i > 0 && <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />}
            <AppText variant="caption" tone={i === 0 ? "primary" : "secondary"} numberOfLines={1} style={i === 0 && styles.bold}>{c}</AppText>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        <AppText variant="subheading" accessibilityLiveRegion="polite">Question {index + 1} of {total}</AppText>
        <View style={styles.timer} accessibilityLabel={`Time on this question ${mmss(seconds)}`}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <AppText variant="mono">{mmss(seconds)}</AppText>
        </View>
      </View>
      <View style={styles.segments} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {questions.map((q, i) => {
          const a = answers[q.id];
          const bg = a ? (a.isCorrect ? colors.primary : colors.error) : i === index ? colors.primarySecondary : tints.subtle;
          return <View key={q.id} style={[styles.segment, { backgroundColor: bg, opacity: !a && i === index ? 0.6 : 1 }]} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  crumbs: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  crumb: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%" },
  bold: { fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timer: { flexDirection: "row", alignItems: "center", gap: 4 },
  segments: { flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: radii.pill },
});
