import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { spacing } from "@techrat/theme";
import { groupTopicsByCategory, percent } from "@/lib/format";
import { useTopicProgress, useTopics } from "@/lib/queries";
import { AppText, Card, Divider, ErrorState, ListRow, LoadingState, ProgressBar, Screen } from "@/components/ui";
import { IconTile } from "@/components/domain/IconTile";

export default function LearnScreen() {
  const router = useRouter();
  const topics = useTopics();
  const progress = useTopicProgress();
  const sections = useMemo(() => groupTopicsByCategory(topics.data ?? []), [topics.data]);
  const bySlug = useMemo(() => new Map((progress.data ?? []).map((p) => [p.topicSlug, p])), [progress.data]);

  if (topics.isLoading) return <LoadingState label="Loading topics" />;
  if (topics.error) return <ErrorState error={topics.error} retry={() => void topics.refetch()} />;

  return (
    <Screen onRefresh={() => { void topics.refetch(); void progress.refetch(); }} refreshing={topics.isRefetching}>
      <AppText variant="title" accessibilityRole="header">Learn</AppText>
      <AppText tone="secondary">Pick a topic to see your progress and start practicing.</AppText>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <AppText variant="eyebrow" tone="muted" accessibilityRole="header">{section.title}</AppText>
          <Card style={styles.card}>
            {section.data.map((t, i) => {
              const p = bySlug.get(t.slug);
              const total = t.questions.total ?? t.questions.easy + t.questions.medium + t.questions.hard + t.questions.expert;
              return (
                <View key={t.slug}>
                  {i > 0 && <Divider />}
                  <View style={styles.row}>
                    <IconTile icon={t.icon} />
                    <View style={styles.flex}>
                      <ListRow
                        title={t.name}
                        subtitle={`${t.subtopics.length} subtopics · ${total} questions${p ? ` · Lv ${p.level.level}` : ""}`}
                        onPress={() => router.push(`/topic/${t.slug}`)}
                      />
                      {p && p.questionsAnswered > 0 && (
                        <ProgressBar value={p.completionPercent} label={`${t.name} ${percent(p.completionPercent)}% complete`} height={4} style={styles.bar} />
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { paddingVertical: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  bar: { marginBottom: spacing.sm },
});
