import { ActivityIndicator, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing } from "@techrat/theme";
import { isApiError } from "@techrat/api";
import { AppText } from "./AppText";
import { Button } from "./Button";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (isApiError(error)) return error.detail || error.title || fallback;
  if (error instanceof Error && /network request failed|fetch/i.test(error.message)) return "Can't reach the TechRat server. Check your connection.";
  return fallback;
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Ionicons name="warning-outline" size={36} color={colors.error} />
      <AppText variant="subheading" style={styles.text}>{errorMessage(error)}</AppText>
      {retry && <Button label="Try again" variant="secondary" icon="refresh" onPress={retry} />}
    </View>
  );
}

export function EmptyState({ icon = "sparkles-outline", text }: { icon?: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={28} color={colors.textMuted} />
      <AppText tone="secondary" style={styles.text}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.background },
  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  text: { textAlign: "center" },
});
