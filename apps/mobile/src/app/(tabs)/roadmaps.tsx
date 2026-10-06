import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useRoadmaps } from "@/lib/queries";
import { AppText, ChipGroup, EmptyState, ErrorState, LoadingState, Screen } from "@/components/ui";
import { RoadmapCard } from "@/components/domain/RoadmapCard";

const ALL = "All";

export default function RoadmapsScreen() {
  const router = useRouter();
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
      {visible.map((r) => <RoadmapCard key={r.slug} roadmap={r} onPress={() => router.push(`/roadmap/${r.slug}`)} />)}
    </Screen>
  );
}
