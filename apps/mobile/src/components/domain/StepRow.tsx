import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import type { RoadmapStep } from "@techrat/types";
import { stepState, type StepState } from "@/lib/format";
import { AppText, Button, DifficultyBadge, XpPill, tints } from "@/components/ui";

const meta: Record<StepState, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }> = {
  Completed: { icon: "checkmark", color: colors.primary, bg: tints.primary, label: "Completed" },
  Current: { icon: "play", color: colors.onPrimary, bg: colors.primary, label: "Current" },
  Locked: { icon: "lock-closed", color: colors.textMuted, bg: tints.subtle, label: "Locked" },
};

/** Roadmap step with an icon + text status (Completed / Current / Locked). */
export function StepRow({ step, onPractice, practicing, compact }: {
  step: RoadmapStep;
  onPractice?: () => void;
  practicing?: boolean;
  compact?: boolean;
}) {
  const state = stepState(step.status);
  const m = meta[state];
  const c = step.criteria;
  return (
    <View style={styles.row}>
      <View style={[styles.marker, { backgroundColor: m.bg }]}>
        <Ionicons name={m.icon} size={14} color={m.color} />
      </View>
      <View style={styles.body}>
        <AppText variant="subheading" tone={state === "Locked" ? "muted" : "default"}>{step.order}. {step.title}</AppText>
        <AppText variant="caption" tone={state === "Locked" ? "muted" : state === "Current" ? "primary" : "secondary"} style={styles.status}>
          {m.label} · {step.topicName}{step.subtopicName ? ` › ${step.subtopicName}` : ""}
        </AppText>
        {!compact && (
          <>
            {!!step.description && <AppText variant="caption" tone="secondary">{step.description}</AppText>}
            <View style={styles.meta}>
              <DifficultyBadge difficulty={step.difficulty} />
              <XpPill xp={step.xpReward} />
              <AppText variant="caption" tone="muted">~{step.estimatedMinutes} min</AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {c
                ? `${c.answeredQuestions}/${c.requiredQuestions} questions · ${Math.round(c.accuracy)}% accuracy (needs ${c.requiredAccuracy}%)`
                : `Needs ${step.minimumQuestions} questions at ${step.minimumAccuracy}% accuracy`}
            </AppText>
            {state === "Current" && onPractice && (
              <Button label="Practice step" icon="play" onPress={onPractice} loading={practicing} accessibilityLabel={`Practice step ${step.title}`} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  marker: { width: 28, height: 28, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", marginTop: 2 },
  body: { flex: 1, gap: spacing.xs },
  status: { fontWeight: "600" },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
});
