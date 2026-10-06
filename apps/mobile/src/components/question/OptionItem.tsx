import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import { AppText, monoFont, tints } from "@/components/ui";
import { RichText } from "./RichText";

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

/** One answer option, exposed as a radio button. After grading it is disabled and labelled (not color-only). */
export function OptionItem({ letter, text, state, checked, locked, onPress }: {
  letter: string;
  text: string;
  state: OptionState;
  /** Whether this is the user's pick (before or after grading). */
  checked: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const suffix = state === "correct" ? ", correct answer" : state === "wrong" ? ", your answer, incorrect" : "";
  return (
    <Pressable
      testID={`option-${letter}`}
      onPress={onPress}
      disabled={locked}
      accessibilityRole="radio"
      accessibilityLabel={`Option ${letter}: ${text}${suffix}`}
      accessibilityState={{ checked, disabled: locked }}
      style={[styles.option, stateStyles[state]]}
    >
      <View style={[styles.letter, letterStyles[state]]}>
        <AppText style={[styles.letterText, { color: state === "correct" || state === "selected" ? colors.onPrimary : colors.text }]}>{letter}</AppText>
      </View>
      <View style={styles.body}>
        <RichText text={text} />
      </View>
      {state === "correct" && (
        <View style={styles.tag}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <AppText variant="caption" tone="primary" style={styles.tagText}>Correct</AppText>
        </View>
      )}
      {state === "wrong" && (
        <View style={styles.tag}>
          <Ionicons name="close-circle" size={18} color={colors.error} />
          <AppText variant="caption" tone="error" style={styles.tagText}>Your answer</AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, minHeight: 56 },
  letter: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  letterText: { fontFamily: monoFont, fontWeight: "700" },
  body: { flex: 1 },
  tag: { alignItems: "center", gap: 2 },
  tagText: { fontWeight: "700", fontSize: 11 },
});

const stateStyles = StyleSheet.create({
  idle: { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
  selected: { borderColor: colors.primary, backgroundColor: tints.primary },
  correct: { borderColor: colors.primary, backgroundColor: tints.primary },
  wrong: { borderColor: colors.error, backgroundColor: tints.error },
  dimmed: { borderColor: colors.border, backgroundColor: colors.backgroundSecondary, opacity: 0.55 },
});

const letterStyles = StyleSheet.create({
  idle: { backgroundColor: tints.subtle },
  selected: { backgroundColor: colors.primary },
  correct: { backgroundColor: colors.primary },
  wrong: { backgroundColor: colors.error },
  dimmed: { backgroundColor: tints.subtle },
});
