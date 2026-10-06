import { Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing } from "@techrat/theme";
import type { Dashboard } from "@techrat/types";
import { formatNumber, greeting, percent } from "@/lib/format";
import { useDashboard } from "@/lib/queries";
import { useLaunchSession } from "@/lib/use-launch-session";
import { AppText, Button, Card, DifficultyBadge, Divider, ErrorState, ListRow, LoadingState, ProgressBar, Screen, SectionHeader, StatCard } from "@/components/ui";
import { LevelSummary } from "@/components/domain/LevelSummary";
import { StepRow } from "@/components/domain/StepRow";
import { TopicProgressCard } from "@/components/domain/TopicProgressCard";

export default function HomeScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useDashboard();
  if (isLoading) return <LoadingState label="Loading your dashboard" />;
  if (error || !data) return <ErrorState error={error} retry={() => void refetch()} />;
  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <Hero data={data} />
      <Stats data={data} />
      <ContinueLearning data={data} />
      <CurrentRoadmap data={data} />
      <DailyChallenge data={data} />
      <Recommended data={data} />
    </Screen>
  );
}

function Hero({ data: { user } }: { data: Dashboard }) {
  return (
    <Card style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.flex}>
          <AppText variant="eyebrow" tone="primary">Your learning journey</AppText>
          <AppText variant="title" accessibilityRole="header">{greeting(new Date().getHours())},{"\n"}{user.displayName}!</AppText>
        </View>
        <Image source={require("../../../assets/rat.png")} style={styles.rat} accessible={false} />
      </View>
      <View style={styles.heroBottom}>
        <View style={styles.streak} accessible accessibilityLabel={`${user.currentStreak} day streak`}>
          <Ionicons name="flame" size={28} color={colors.warning} />
          <AppText variant="mono" style={styles.streakValue}>{user.currentStreak}</AppText>
          <AppText variant="caption" tone="secondary">Day streak</AppText>
        </View>
        <LevelSummary level={user.level} />
      </View>
    </Card>
  );
}

function Stats({ data: { user } }: { data: Dashboard }) {
  const router = useRouter();
  return (
    <View style={styles.grid}>
      <StatCard icon="star-outline" value={formatNumber(user.level.totalXp)} label="Total XP" />
      <StatCard icon="code-slash-outline" value={formatNumber(user.questionsAnswered)} label="Questions solved" />
      <StatCard icon="locate-outline" value={`${percent(user.accuracy)}%`} label="Accuracy" />
      <StatCard icon="trophy-outline" value={`#${user.globalRank}`} label="Global rank" tone="warning" onPress={() => router.push("/leaderboard")} />
    </View>
  );
}

function ContinueLearning({ data }: { data: Dashboard }) {
  const router = useRouter();
  return (
    <View style={styles.section}>
      <SectionHeader title="Continue Learning" action="All topics" onAction={() => router.navigate("/learn")} />
      <View style={styles.grid}>
        {data.continueLearning.slice(0, 4).map((t) => (
          <TopicProgressCard key={t.topicSlug} topic={t} onPress={() => router.push(`/topic/${t.topicSlug}`)} />
        ))}
      </View>
    </View>
  );
}

function CurrentRoadmap({ data: { currentRoadmap, currentRoadmapSteps } }: { data: Dashboard }) {
  const router = useRouter();
  if (!currentRoadmap) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Your Roadmap" />
        <Card style={styles.gap}>
          <AppText variant="subheading">Pick a path and start leveling up</AppText>
          <AppText tone="secondary">Structured roadmaps from Junior Engineer to System Design.</AppText>
          <Button label="Browse roadmaps" icon="map-outline" onPress={() => router.navigate("/roadmaps")} />
        </Card>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <SectionHeader title="Your Roadmap" action="View roadmap" onAction={() => router.push(`/roadmap/${currentRoadmap.slug}`)} />
      <Card style={styles.gap}>
        <AppText variant="subheading">{currentRoadmap.name}</AppText>
        <AppText variant="caption" tone="secondary">
          {currentRoadmap.completedSteps} of {currentRoadmap.stepsCount} steps · {percent(currentRoadmap.percentComplete)}%
        </AppText>
        <ProgressBar value={currentRoadmap.percentComplete} label={`${currentRoadmap.name} progress`} />
        {currentRoadmapSteps.map((s) => <StepRow key={s.id} step={s} compact />)}
      </Card>
    </View>
  );
}

function DailyChallenge({ data: { dailyChallenge: d } }: { data: Dashboard }) {
  const { launch, pending, error } = useLaunchSession();
  return (
    <View style={styles.section}>
      <SectionHeader title="Daily Challenge" />
      <Card style={styles.gap}>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <AppText variant="subheading">{d.questionsCount} mixed questions</AppText>
        </View>
        <AppText tone="secondary">One per topic, refreshed daily. Bonus +{d.bonusXp} XP once a day.</AppText>
        {d.sessionId && !d.completed && (
          <ProgressBar value={(100 * d.answeredCount) / Math.max(1, d.questionsCount)} label="Daily challenge progress" />
        )}
        {d.completed ? (
          <View style={styles.row} accessible accessibilityLabel={`Daily challenge completed today, ${d.correctCount} of ${d.questionsCount} correct`}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <AppText tone="primary">Completed today · {d.correctCount}/{d.questionsCount} correct</AppText>
          </View>
        ) : (
          <Button label={d.sessionId ? "Resume challenge" : "Start daily challenge"} icon="flash" loading={pending} onPress={() => launch("daily")} />
        )}
        {error && <AppText tone="error" accessibilityRole="alert">{error}</AppText>}
      </Card>
    </View>
  );
}

function Recommended({ data }: { data: Dashboard }) {
  const router = useRouter();
  if (data.recommended.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title="Recommended" />
      <Card style={styles.list}>
        {data.recommended.map((r, i) => (
          <View key={`${r.kind}-${r.topicSlug}-${r.title}`}>
            {i > 0 && <Divider />}
            <ListRow
              icon={r.kind === "Challenge" ? "flash-outline" : "locate-outline"}
              title={r.title}
              subtitle={r.reason}
              trailing={r.difficulty ? <DifficultyBadge difficulty={r.difficulty} /> : undefined}
              accessibilityHint="Opens practice setup"
              onPress={() =>
                router.navigate({ pathname: "/practice", params: { topic: r.topicSlug, subtopic: r.subtopicSlug ?? "", difficulty: r.difficulty ?? "" } })
              }
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: spacing.lg },
  heroTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rat: { width: 84, height: 84 },
  heroBottom: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  streak: { alignItems: "center", paddingRight: spacing.lg, borderRightWidth: 1, borderRightColor: colors.border },
  streakValue: { fontSize: 26 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  section: { gap: spacing.md },
  gap: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  list: { paddingVertical: spacing.xs },
});
