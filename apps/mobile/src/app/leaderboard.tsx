import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@techrat/theme";
import type { LeaderboardEntry, LeaderboardScope } from "@techrat/types";
import { formatNumber, percent } from "@/lib/format";
import { useLeaderboard } from "@/lib/queries";
import { AppText, Avatar, Card, ChipGroup, Divider, EmptyState, ErrorState, LoadingState, Screen } from "@/components/ui";

const SCOPES: { value: Exclude<LeaderboardScope, "Topic">; label: string }[] = [
  { value: "Global", label: "Global" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
];

export default function LeaderboardScreen() {
  const [scope, setScope] = useState<Exclude<LeaderboardScope, "Topic">>("Global");
  const { data, isLoading, error, refetch, isRefetching } = useLeaderboard(scope);

  return (
    <Screen edges={[]} onRefresh={() => void refetch()} refreshing={isRefetching}>
      <ChipGroup label="Period" options={SCOPES} value={scope} onChange={setScope} role="tab" />
      {isLoading && <LoadingState label="Loading leaderboard" />}
      {error && <ErrorState error={error} retry={() => void refetch()} />}
      {data && (
        <>
          {data.me && (
            <Card highlighted>
              <AppText variant="eyebrow" tone="primary">Your rank</AppText>
              <EntryRow entry={data.me} highlight />
            </Card>
          )}
          <Card style={styles.list}>
            {data.entries.length === 0 && <EmptyState icon="trophy-outline" text="No one has scored in this period yet." />}
            {data.entries.map((e, i) => (
              <View key={e.userId}>
                {i > 0 && <Divider />}
                <EntryRow entry={e} highlight={e.userId === data.me?.userId} />
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function EntryRow({ entry: e, highlight }: { entry: LeaderboardEntry; highlight?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Rank ${e.rank}, ${e.displayName}, level ${e.level}, ${formatNumber(e.xp)} XP${highlight ? ", you" : ""}`}>
      <AppText variant="mono" tone={e.rank <= 3 ? "warning" : "secondary"} style={styles.rank}>#{e.rank}</AppText>
      <Avatar name={e.displayName} url={e.avatarUrl} size={36} />
      <View style={styles.flex}>
        <AppText variant="subheading" tone={highlight ? "primary" : "default"} numberOfLines={1}>{e.displayName}</AppText>
        <AppText variant="caption" tone="muted">Lv {e.level} · {e.questions} questions · {percent(e.accuracy)}%</AppText>
      </View>
      <AppText variant="mono" tone="primary">{formatNumber(e.xp)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rank: { width: 44, color: colors.textSecondary },
  flex: { flex: 1 },
});
