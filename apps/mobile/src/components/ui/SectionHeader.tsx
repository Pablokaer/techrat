import { Pressable, StyleSheet, View } from "react-native";
import { spacing } from "@techrat/theme";
import { AppText } from "./AppText";
import { hitSlop } from "./tokens";

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.row}>
      <AppText variant="heading" accessibilityRole="header">{title}</AppText>
      {action && onAction && (
        <Pressable onPress={onAction} accessibilityRole="link" accessibilityLabel={`${action}: ${title}`} hitSlop={hitSlop}>
          <AppText variant="caption" tone="primary" style={styles.action}>{action}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  action: { fontWeight: "600" },
});
