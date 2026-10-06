import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import type { RoadmapSummary } from "@techrat/types";
import { percent } from "@/lib/format";
import { useRoadmaps } from "@/lib/queries";
import { AppText, ChipGroup, EmptyState, ErrorState, LoadingState, ProgressBar, Screen, XpPill } from "@/components/ui";
import { IconTile } from "@/components/domain/IconTile";

const ALL = "All";

export default function RoadmapsScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useRoadmaps();
  const [category, setCategory] = useState(ALL);
  const categories = useMemo(() => [ALL, ...new Set((data ?? []).map((r) => r.category))], [data]);
  const visible = (data ?? []).filter((r) => category === ALL || r.category === category);

  if (isLoading) return <LoadingState label="Loading roadmaps" />;
  if (error) return <ErrorState error={error} retry={() => void refetch()} />;

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <AppText variant="title" accessibilityRole="header">Roadmaps</AppText>
      <ChipGroup label="Category" options={categories.map((c) => ({ value: c, label: c }))} value={category} onChange={setCategory} scroll />
      {visible.length === 0 && <EmptyState text="No roadmaps in this category yet." />}
      {visible.map((r) => <RoadmapCard key={r.slug} roadmap={r} />)}
    </Screen>
  );
}

function RoadmapCard({ roadmap: r }: { roadmap: RoadmapSummary }) {
  const router = useRouter();
  const locked = r.progress ? !r.progress.isUnlocked : r.prerequisites.length > 0;
  const status = locked ? "Locked" : r.progress?.isCompleted ? "Completed" : r.progress?.isStarted ? "In progress" : "Not started";
  return (
    <Pressable
      onPress={() => router.push(`/roadmap/${r.slug}`)}
      accessibilityRole="button"
      accessibilityLabel={`${r.name}, ${status}${r.progress?.isStarted ? `, ${percent(r.progress.percentComplete)}% complete` : ""}`}
      style={({ pressed }) => [styles.card, locked && styles.locked, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <IconTile icon={r.icon} muted={locked} />
        <View style={styles.flex}>
          <AppText variant="subheading" tone={locked ? "secondary" : "default"}>{r.name}</AppText>
          <AppText variant="caption" tone="muted">{r.category} · {r.difficulty} · {r.estimatedHours}h · {r.stepsCount} steps</AppText>
        </View>
        {locked && <Ionicons name="lock-closed" size={18} color={colors.textMuted} />}
        {r.progress?.isCompleted && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
      </View>
      <AppText variant="caption" tone="secondary" numberOfLines={2}>{r.description}</AppText>
      {r.progress?.isStarted && <ProgressBar value={r.progress.percentComplete} label={`${r.name} progress`} height={6} />}
      <View style={styles.row}>
        <AppText variant="caption" tone={locked ? "muted" : r.progress?.isStarted ? "primary" : "secondary"} style={styles.flex}>
          {locked ? `Locked · requires ${r.prerequisites.join(", ") || "prerequisites"}` : status}
          {r.progress?.isStarted && !r.progress.isCompleted ? ` · ${percent(r.progress.percentComplete)}%` : ""}
        </AppText>
        <XpPill xp={r.xpReward} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  locked: { opacity: 0.75 },
  pressed: { opacity: 0.8 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
});
