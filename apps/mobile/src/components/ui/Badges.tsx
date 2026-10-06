import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, difficultyColors, radii, spacing, tierColors } from "@techrat/theme";
import { withAlpha } from "@/lib/format";
import { AppText } from "./AppText";

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const color = difficultyColors[difficulty as keyof typeof difficultyColors] ?? colors.textSecondary;
  return (
    <View accessibilityLabel={`Difficulty ${difficulty}`} style={[styles.pill, { borderColor: withAlpha(color, 0.5), backgroundColor: withAlpha(color, 0.1) }]}>
      <AppText variant="caption" style={{ color, fontWeight: "700" }}>{difficulty}</AppText>
    </View>
  );
}

export function XpPill({ xp, prefix = "" }: { xp: number; prefix?: string }) {
  return (
    <View accessibilityLabel={`${prefix}${xp} XP`} style={[styles.pill, styles.xp]}>
      <Ionicons name="flash" size={12} color={colors.primary} />
      <AppText variant="mono" tone="primary" style={styles.xpText}>{prefix}{xp} XP</AppText>
    </View>
  );
}

export function TierDot({ tier }: { tier: string }) {
  const color = tierColors[tier as keyof typeof tierColors] ?? colors.textMuted;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill, borderWidth: 1, alignSelf: "flex-start" },
  xp: { borderColor: colors.border, backgroundColor: colors.primaryMuted },
  xpText: { fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
