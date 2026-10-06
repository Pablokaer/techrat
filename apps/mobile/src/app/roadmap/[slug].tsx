import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing } from "@techrat/theme";
import { percent } from "@/lib/format";
import { useRoadmap, useStartRoadmap } from "@/lib/queries";
import { useLaunchSession } from "@/lib/use-launch-session";
import { AppText, Button, Card, Divider, ErrorState, LoadingState, ProgressBar, Screen, XpPill, errorMessage } from "@/components/ui";
import { IconTile } from "@/components/domain/IconTile";
import { StepRow } from "@/components/domain/StepRow";

export default function RoadmapScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading, error, refetch } = useRoadmap(slug);
  const start = useStartRoadmap(slug);
  const { launch, pendingBody, error: launchError } = useLaunchSession();

  if (isLoading) return <LoadingState label="Loading roadmap" />;
  if (error || !data) return <ErrorState error={error} retry={() => void refetch()} />;
  const { summary, prerequisites, modules } = data;
  const state = summary.progress;
  const locked = state ? !state.isUnlocked : prerequisites.some((p) => !p.isMet);
  const pendingStep = typeof pendingBody === "object" ? pendingBody.roadmapStepId : undefined;

  return (
    <Screen edges={[]} onRefresh={() => void refetch()}>
      <Stack.Screen options={{ title: summary.name }} />
      <Card style={styles.gap}>
        <View style={styles.row}>
          <IconTile icon={summary.icon} size={48} muted={locked} />
          <View style={styles.flex}>
            <AppText variant="heading" accessibilityRole="header">{summary.name}</AppText>
            <AppText variant="caption" tone="muted">{summary.category} · {summary.difficulty} · {summary.estimatedHours}h</AppText>
          </View>
          <XpPill xp={summary.xpReward} />
        </View>
        <AppText tone="secondary">{summary.description}</AppText>
        {state?.isStarted && (
          <>
            <ProgressBar value={state.percentComplete} label={`${summary.name} progress`} />
            <AppText variant="caption" tone="secondary">{state.completedSteps} of {summary.stepsCount} steps · {percent(state.percentComplete)}%</AppText>
          </>
        )}
        {prerequisites.length > 0 && (
          <View style={styles.gapSm}>
            <AppText variant="eyebrow" tone="muted">Prerequisites</AppText>
            {prerequisites.map((p) => (
              <View key={p.slug} style={styles.row} accessible accessibilityLabel={`${p.name}: ${p.isMet ? "met" : "not met"}, ${percent(p.currentPercent)}% of ${p.minimumPercent}% required`}>
                <Ionicons name={p.isMet ? "checkmark-circle" : "lock-closed"} size={16} color={p.isMet ? colors.primary : colors.textMuted} />
                <AppText variant="caption" tone={p.isMet ? "primary" : "secondary"} style={styles.flex}>
                  {p.name} — {percent(p.currentPercent)}% / {p.minimumPercent}% {p.isMet ? "(met)" : "(not met)"}
                </AppText>
              </View>
            ))}
          </View>
        )}
        {!state?.isStarted && (
          <Button
            label={locked ? "Locked" : "Start roadmap"}
            icon={locked ? "lock-closed" : "rocket-outline"}
            disabled={locked}
            loading={start.isPending}
            onPress={() => start.mutate()}
          />
        )}
        {start.error && <AppText tone="error" accessibilityRole="alert">{errorMessage(start.error, "Could not start this roadmap")}</AppText>}
        {launchError && <AppText tone="error" accessibilityRole="alert">{launchError}</AppText>}
      </Card>

      {modules.map((m) => (
        <Card key={m.id} style={styles.gapSm}>
          <View style={styles.row}>
            <AppText variant="subheading" style={styles.flex} accessibilityRole="header">Module {m.order}: {m.title}</AppText>
            {m.isCompleted && <Ionicons name="checkmark-done" size={18} color={colors.primary} accessibilityLabel="Module completed" />}
          </View>
          {m.steps.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <Divider />}
              <StepRow
                step={s}
                practicing={pendingStep === s.id}
                onPractice={state?.isStarted ? () => launch({ mode: "Roadmap", roadmapStepId: s.id }) : undefined}
              />
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
});
