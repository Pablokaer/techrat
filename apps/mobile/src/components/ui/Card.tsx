import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radii, spacing } from "@techrat/theme";

export function Card({ style, highlighted, ...rest }: ViewProps & { highlighted?: boolean }) {
  return <View {...rest} style={[styles.card, highlighted && styles.highlighted, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  highlighted: { borderColor: colors.primary },
});
