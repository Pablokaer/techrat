import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import { AppText } from "./AppText";

/** Tappable row with leading icon, title/subtitle and a trailing slot. */
export function ListRow({ icon, title, subtitle, trailing, tone = "default", onPress, accessibilityLabel, accessibilityHint }: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  /** "danger" marks destructive rows (red icon and title), such as deleting the account. */
  tone?: "default" | "danger";
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon && (
        <View style={[styles.icon, tone === "danger" && styles.iconDanger]}>
          <Ionicons name={icon} size={20} color={tone === "danger" ? colors.error : colors.primary} />
        </View>
      )}
      <View style={styles.body}>
        <AppText variant="subheading" tone={tone === "danger" ? "error" : "default"} numberOfLines={1}>{title}</AppText>
        {subtitle && <AppText variant="caption" tone="secondary" numberOfLines={2}>{subtitle}</AppText>}
      </View>
      {trailing}
      {onPress && !trailing && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  iconDanger: { backgroundColor: colors.card },
  body: { flex: 1, gap: 2 },
});
