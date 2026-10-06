import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import { AppText } from "./AppText";

/** `revealable` makes it a password field with a show/hide button. */
export function TextField({ label, error, revealable, ...input }: TextInputProps & { label: string; error?: string; revealable?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" tone="secondary" style={styles.label}>{label}</AppText>
      <View>
        <TextInput
          {...input}
          {...(revealable ? { secureTextEntry: !visible, autoCapitalize: "none" as const, autoCorrect: false } : {})}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          style={[styles.input, !!error && styles.inputError, revealable && styles.inputWithButton]}
        />
        {revealable && (
          <Pressable onPress={() => setVisible((v) => !v)} accessibilityRole="button" accessibilityLabel={visible ? "Hide password" : "Show password"}
            accessibilityState={{ selected: visible }} hitSlop={8} style={styles.reveal}>
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error && <AppText variant="caption" tone="error" accessibilityLiveRegion="polite">{error}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontWeight: "600" },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
  inputError: { borderColor: colors.error },
  inputWithButton: { paddingRight: 48 },
  reveal: { position: "absolute", right: 0, top: 0, bottom: 0, width: 48, alignItems: "center", justifyContent: "center" },
});
