import { Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import { AppText } from "./AppText";

export function StatCard({ icon, value, label, onPress, tone = "primary" }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  onPress?: () => void;
  tone?: "primary" | "warning";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "summary"}
      accessibilityLabel={`${label}: ${value}`}
      style={styles.card}
    >
      <Ionicons name={icon} size={20} color={tone === "warning" ? colors.warning : colors.primary} />
      <AppText variant="mono" style={styles.value}>{value}</AppText>
      <AppText variant="caption" tone="secondary">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: "47%", flexGrow: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  value: { fontSize: 22, marginTop: spacing.xs },
});
