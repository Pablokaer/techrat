import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, difficultyColors, radii, spacing, tierColors } from "@techrat/theme";
import { withAlpha } from "@/lib/format";
import { AppText } from "./AppText";
import { tints } from "./tokens";

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

type BadgeTone = "primary" | "solid" | "neutral" | "warning";

const badgeTones: Record<BadgeTone, { border: string; bg: string; text: string }> = {
  primary: { border: withAlpha(colors.primary, 0.5), bg: colors.primaryMuted, text: colors.primary },
  solid: { border: colors.primary, bg: colors.primary, text: colors.onPrimary },
  neutral: { border: colors.border, bg: tints.subtle, text: colors.textSecondary },
  warning: { border: withAlpha(colors.warning, 0.5), bg: tints.warning, text: colors.warning },
};

/**
 * Small status pill (icon + text). The visible text always carries the meaning, so color is never the only cue;
 * `accessibilityLabel` lets screen readers get a fuller sentence than the terse visual label.
 */
export function LabelBadge({ label, icon, tone = "neutral", accessibilityLabel }: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: BadgeTone;
  accessibilityLabel?: string;
}) {
  const t = badgeTones[tone];
  return (
    <View accessible accessibilityLabel={accessibilityLabel ?? label} style={[styles.pill, { borderColor: t.border, backgroundColor: t.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={t.text} />}
      <AppText variant="caption" style={{ color: t.text, fontWeight: "700" }}>{label}</AppText>
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
