import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "@techrat/theme";
import { AppText } from "./AppText";

export function TextField({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" tone="secondary" style={styles.label}>{label}</AppText>
      <TextInput
        {...input}
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={[styles.input, !!error && styles.inputError]}
      />
      {error && <AppText variant="caption" tone="error" accessibilityLiveRegion="polite">{error}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontWeight: "600" },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
  inputError: { borderColor: colors.error },
});
