import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing } from "@techrat/theme";
import type { LevelDto } from "@techrat/types";
import { formatNumber } from "@/lib/format";
import { AppText, ProgressBar } from "@/components/ui";

export function LevelSummary({ level }: { level: LevelDto }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Ionicons name="diamond-outline" size={22} color={colors.primary} />
        <AppText variant="heading">Level {level.level}</AppText>
      </View>
      <ProgressBar value={level.progressPercent} label={`Level ${level.level} progress`} />
      <AppText variant="caption" tone="secondary" style={styles.mono}>
        {formatNumber(level.xpIntoLevel)} / {formatNumber(level.xpForThisLevel)} XP · {formatNumber(level.xpToNextLevel)} to next
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  mono: { fontVariant: ["tabular-nums"] },
});
