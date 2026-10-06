import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { spacing } from "@techrat/theme";
import { DIFFICULTIES, type Difficulty, type PracticeMode } from "@techrat/types";
import { useTopics } from "@/lib/queries";
import { useLaunchSession } from "@/lib/use-launch-session";
import { AppText, Button, Card, ChipGroup, ErrorState, LoadingState, Screen, type ChipOption } from "@/components/ui";

type SetupMode = Extract<PracticeMode, "Practice" | "Challenge" | "Adaptive" | "Random">;

const MODES: (ChipOption<SetupMode> & { hint: string })[] = [
  { value: "Practice", label: "Practice", hint: "Any topic, or the one you pick. A fresh random draw every session." },
  { value: "Challenge", label: "Challenge", hint: "Harder questions only (no Easy), more XP." },
  { value: "Adaptive", label: "Adaptive", hint: "Difficulty adapts to your accuracy." },
  { value: "Random", label: "Random", hint: "A mix from any topic." },
];
const COUNTS = ["5", "10", "15", "20"] as const;
const ANY = "any";

export default function PracticeScreen() {
  const params = useLocalSearchParams<{ topic?: string; subtopic?: string; difficulty?: string; mode?: string }>();
  const topics = useTopics();
  const { launch, pending, error } = useLaunchSession();

  const [mode, setMode] = useState<SetupMode>("Practice");
  const [topic, setTopic] = useState<string>(ANY);
  const [subtopic, setSubtopic] = useState<string>(ANY);
  const [difficulty, setDifficulty] = useState<string>(ANY);
  const [count, setCount] = useState<(typeof COUNTS)[number]>("10");

  // Prefill from deep links (Home recommendations, Topic detail "Customize").
  useEffect(() => {
    if (params.topic) setTopic(params.topic);
    setSubtopic(params.subtopic || ANY);
    if (params.difficulty && (DIFFICULTIES as string[]).includes(params.difficulty)) setDifficulty(params.difficulty);
    if (params.mode && MODES.some((m) => m.value === params.mode)) setMode(params.mode as SetupMode);
  }, [params.topic, params.subtopic, params.difficulty, params.mode]);

  const selectedTopic = topics.data?.find((t) => t.slug === topic);
  const topicOptions = useMemo<ChipOption<string>[]>(
    () => [{ value: ANY, label: "Any topic" }, ...(topics.data ?? []).map((t) => ({ value: t.slug, label: t.name }))],
    [topics.data],
  );
  const subtopicOptions = useMemo<ChipOption<string>[]>(
    () => [{ value: ANY, label: "All subtopics" }, ...(selectedTopic?.subtopics ?? []).map((s) => ({ value: s.slug, label: s.name }))],
    [selectedTopic],
  );

  if (topics.isLoading) return <LoadingState label="Loading topics" />;
  if (topics.error) return <ErrorState error={topics.error} retry={() => void topics.refetch()} />;

  const start = () =>
    launch({
      mode,
      topicSlug: topic === ANY ? null : topic,
      subtopicSlug: topic === ANY || subtopic === ANY ? null : subtopic,
      difficulty: mode === "Adaptive" || difficulty === ANY ? null : (difficulty as Difficulty),
      count: Number(count),
    });

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">Practice</AppText>
      <Card style={styles.card}>
        <ChipGroup label="Mode" options={MODES} value={mode} onChange={setMode} />
        <AppText variant="caption" tone="secondary">{MODES.find((m) => m.value === mode)?.hint}</AppText>
        <ChipGroup label="Topic" options={topicOptions} value={topic} onChange={(v) => { setTopic(v); setSubtopic(ANY); }} scroll />
        {selectedTopic && <ChipGroup label="Subtopic" options={subtopicOptions} value={subtopic} onChange={setSubtopic} scroll />}
        {mode !== "Adaptive" && (
          <ChipGroup
            label="Difficulty"
            options={[{ value: ANY, label: "Any" }, ...DIFFICULTIES.map((d) => ({ value: d, label: d }))]}
            value={difficulty}
            onChange={setDifficulty}
          />
        )}
        <ChipGroup label="Questions" options={COUNTS.map((c) => ({ value: c, label: c }))} value={count} onChange={setCount} />
      </Card>
      {error && <AppText tone="error" accessibilityRole="alert">{error}</AppText>}
      <Button label="Start session" icon="play" onPress={start} loading={pending} />
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.lg } });
