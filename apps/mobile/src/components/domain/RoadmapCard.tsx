import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import type { RoadmapSummary } from "@techrat/types";
import { alreadyHaveModulesText, percent } from "@/lib/format";
import { AppText, ProgressBar, XpPill } from "@/components/ui";
import { IconTile } from "./IconTile";

/**
 * Roadmap entry in the catalog list. Because modules are shared between roadmaps, it also tells the learner
 * how many of this roadmap's modules they already completed elsewhere.
 */
export function RoadmapCard({ roadmap: r, onPress }: { roadmap: RoadmapSummary; onPress: () => void }) {
  const locked = r.progress ? !r.progress.isUnlocked : r.prerequisites.length > 0;
  const status = locked ? "Locked" : r.progress?.isCompleted ? "Completed" : r.progress?.isStarted ? "In progress" : "Not started";
  // Once completed, "already have" is redundant with the Completed status.
  const alreadyHave = r.progress && !r.progress.isCompleted ? alreadyHaveModulesText(r.progress.alreadyCompletedModules, r.modulesCount) : null;
  const a11y = [
    r.name,
    status,
    r.progress?.isStarted ? `${percent(r.progress.percentComplete)}% complete` : null,
    alreadyHave?.replace(/^You/, "you"),
  ].filter(Boolean).join(", ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.card, locked && styles.locked, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <IconTile icon={r.icon} muted={locked} />
        <View style={styles.flex}>
          <AppText variant="subheading" tone={locked ? "secondary" : "default"}>{r.name}</AppText>
          <AppText variant="caption" tone="muted">{r.category} · {r.difficulty} · {r.estimatedHours}h · {r.stepsCount} steps</AppText>
        </View>
        {locked && <Ionicons name="lock-closed" size={18} color={colors.textMuted} />}
        {r.progress?.isCompleted && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
      </View>
      <AppText variant="caption" tone="secondary" numberOfLines={2}>{r.description}</AppText>
      {r.progress?.isStarted && <ProgressBar value={r.progress.percentComplete} label={`${r.name} progress`} height={6} />}
      {alreadyHave && (
        <View style={styles.hint}>
          <Ionicons name="checkmark-done" size={14} color={colors.primary} />
          <AppText variant="caption" tone="primary">{alreadyHave}</AppText>
        </View>
      )}
      <View style={styles.row}>
        <AppText variant="caption" tone={locked ? "muted" : r.progress?.isStarted ? "primary" : "secondary"} style={styles.flex}>
          {locked ? `Locked · requires ${r.prerequisites.join(", ") || "prerequisites"}` : status}
          {r.progress?.isStarted && !r.progress.isCompleted ? ` · ${percent(r.progress.percentComplete)}%` : ""}
        </AppText>
        <XpPill xp={r.xpReward} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  locked: { opacity: 0.75 },
  pressed: { opacity: 0.8 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hint: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  flex: { flex: 1 },
});
