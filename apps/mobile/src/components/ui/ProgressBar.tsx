import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii } from "@techrat/theme";
import { percent } from "@/lib/format";
import { tints } from "./tokens";

export function ProgressBar({ value, label, color = colors.primary, height = 8, style }: {
  value: number;
  label: string;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = percent(value);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: p }}
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
    >
      <View style={[styles.fill, { width: `${p}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: tints.subtle, overflow: "hidden", borderRadius: radii.pill },
  fill: { height: "100%" },
});
