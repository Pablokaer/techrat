import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "@techrat/theme";
import { AppText } from "./AppText";
import { Chip } from "./Chip";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

/** A labelled radio group of chips; scrolls horizontally when `scroll` is set. */
export function ChipGroup<T extends string>({ label, options, value, onChange, scroll, role = "radio" }: {
  label?: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scroll?: boolean;
  role?: "radio" | "tab";
}) {
  const chips = options.map((o) => (
    <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} role={role} />
  ));
  return (
    <View style={styles.wrap}>
      {label && <AppText variant="eyebrow" tone="muted">{label}</AppText>}
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole={role === "tab" ? "tablist" : "radiogroup"} accessibilityLabel={label}>
          {chips}
        </ScrollView>
      ) : (
        <View style={[styles.row, styles.wrapRow]} accessibilityRole={role === "tab" ? "tablist" : "radiogroup"} accessibilityLabel={label}>{chips}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  wrapRow: { flexWrap: "wrap" },
});
