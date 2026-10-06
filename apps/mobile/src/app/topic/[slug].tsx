import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { colors, difficultyColors, spacing } from "@techrat/theme";
import { DIFFICULTIES, type TopicDetail } from "@techrat/types";
import { percent } from "@/lib/format";
import { useTopic } from "@/lib/queries";
import { useLaunchSession } from "@/lib/use-launch-session";
import { AppText, Button, Card, Divider, ErrorState, ListRow, LoadingState, ProgressBar, Screen, SectionHeader } from "@/components/ui";
import { IconTile } from "@/components/domain/IconTile";

export default function TopicScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useTopic(slug);
  const { launch, pending, pendingBody, error: launchError } = useLaunchSession();

  if (isLoading) return <LoadingState label="Loading topic" />;
  if (error || !data) return <ErrorState error={error} retry={() => void refetch()} />;
  const { topic, progress, subtopicProgress } = data;
  const pendingSubtopic = typeof pendingBody === "object" ? pendingBody.subtopicSlug : undefined;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: topic.name }} />
      <Card style={styles.gap}>
        <View style={styles.row}>
          <IconTile icon={topic.icon} size={48} />
          <View style={styles.flex}>
            <AppText variant="heading" accessibilityRole="header">{topic.name}</AppText>
            <AppText variant="caption" tone="muted">{topic.category}</AppText>
          </View>
          {progress && <AppText variant="mono" tone="primary">Lv {progress.level.level}</AppText>}
        </View>
        <AppText tone="secondary">{topic.description}</AppText>
        {progress && (
          <>
            <ProgressBar value={progress.completionPercent} label={`${topic.name} completion`} />
            <AppText variant="caption" tone="secondary">
              {progress.distinctAnswered}/{progress.totalQuestions} questions seen · {percent(progress.accuracy)}% accuracy
            </AppText>
          </>
        )}
        <Button label="Start practice" icon="play" loading={pending && !pendingSubtopic} onPress={() => launch({ mode: "Practice", topicSlug: topic.slug, count: 10 })} />
        <Button label="Customize session" variant="secondary" icon="options-outline"
          onPress={() => router.navigate({ pathname: "/practice", params: { topic: topic.slug, subtopic: "" } })} />
        {launchError && <AppText tone="error" accessibilityRole="alert">{launchError}</AppText>}
      </Card>

      <SectionHeader title="By difficulty" />
      <DifficultyStats data={data} />

      <SectionHeader title="Subtopics" />
      <Card style={styles.list}>
        {topic.subtopics.map((s, i) => {
          const sp = subtopicProgress.find((p) => p.slug === s.slug);
          return (
            <View key={s.slug}>
              {i > 0 && <Divider />}
              <ListRow
                title={s.name}
                subtitle={`${s.questionCount} questions${sp && sp.answered > 0 ? ` · ${sp.answered} answered · ${percent(sp.accuracy)}%` : ""}`}
                accessibilityHint="Starts a practice session for this subtopic"
                trailing={<AppText variant="caption" tone="primary">{pendingSubtopic === s.slug ? "Starting…" : "Practice"}</AppText>}
                onPress={() => launch({ mode: "Practice", topicSlug: topic.slug, subtopicSlug: s.slug, count: 10 })}
              />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

function DifficultyStats({ data: { topic, byDifficulty } }: { data: TopicDetail }) {
  const counts = { Easy: topic.questions.easy, Medium: topic.questions.medium, Hard: topic.questions.hard, Expert: topic.questions.expert };
  return (
    <View style={styles.grid}>
      {DIFFICULTIES.map((d) => {
        const b = byDifficulty.find((x) => x.difficulty === d);
        return (
          <Card key={d} style={styles.diff} accessible accessibilityLabel={`${d}: ${counts[d]} questions, ${b?.answered ?? 0} answered, ${percent(b?.accuracy ?? 0)}% accuracy`}>
            <AppText variant="subheading" style={{ color: difficultyColors[d] }}>{d}</AppText>
            <AppText variant="mono">{counts[d]}</AppText>
            <AppText variant="caption" tone="muted">questions</AppText>
            <AppText variant="caption" tone="secondary">{b?.answered ?? 0} answered · {percent(b?.accuracy ?? 0)}%</AppText>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  list: { paddingVertical: spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  diff: { flexBasis: "47%", flexGrow: 1, gap: 2, borderColor: colors.border },
});
