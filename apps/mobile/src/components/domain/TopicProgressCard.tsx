import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@techrat/theme";
import type { TopicProgress } from "@techrat/types";
import { percent } from "@/lib/format";
import { AppText, ProgressBar } from "@/components/ui";
import { IconTile } from "./IconTile";

export function TopicProgressCard({ topic, onPress }: { topic: TopicProgress; onPress: () => void }) {
  const done = percent(topic.completionPercent);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${topic.topicName}, level ${topic.level.level}, ${done}% complete`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <IconTile icon={topic.icon} size={36} />
        <AppText variant="caption" tone="secondary">Lv {topic.level.level}</AppText>
      </View>
      <AppText variant="subheading" numberOfLines={1}>{topic.topicName}</AppText>
      <AppText variant="caption" tone="muted">{topic.distinctAnswered}/{topic.totalQuestions} questions</AppText>
      <ProgressBar value={done} label={`${topic.topicName} completion`} height={6} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: "47%", flexGrow: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  pressed: { opacity: 0.8 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
