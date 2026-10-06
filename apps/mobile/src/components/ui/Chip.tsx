import { Pressable, StyleSheet } from "react-native";
import { colors, radii, spacing } from "@techrat/theme";
import { AppText } from "./AppText";

/** Single-select chip. Exposed as a radio (or tab) so screen readers announce the selection. */
export function Chip({ label, selected, onPress, role = "radio", accessibilityLabel }: {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: "radio" | "tab";
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, checked: role === "radio" ? selected : undefined }}
      style={[styles.chip, selected && styles.selected]}
    >
      <AppText variant="caption" style={{ color: selected ? colors.primary : colors.textSecondary, fontWeight: "600" }}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, minHeight: 36, justifyContent: "center" },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
});
