import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing } from "@techrat/theme";
import type { Achievement } from "@techrat/types";
import { useAuth } from "@/lib/auth";
import { PRIVACY_URL, TERMS_URL } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { openReference } from "@/lib/links";
import { formatNumber, percent } from "@/lib/format";
import { useMe, useProfile } from "@/lib/queries";
import { AppText, Avatar, Button, Card, Divider, ErrorState, ListRow, LoadingState, ProgressBar, Screen, SectionHeader, StatCard, TierDot } from "@/components/ui";
import { AppVersion } from "@/components/domain/AppVersion";
import { AvatarPicker } from "@/components/domain/AvatarPicker";
import { LevelSummary } from "@/components/domain/LevelSummary";
import { TopicIcon } from "@/components/domain/TopicIcon";

export default function ProfileScreen() {
  const router = useRouter();
  const t = useT().profile;
  const legal = useT().legal;
  const { signOut } = useAuth();
  const me = useMe();
  const profile = useProfile(me.data?.username);

  if (me.isLoading || (profile.isLoading && !profile.data)) return <LoadingState label="Loading profile" />;
  if (me.error || profile.error || !me.data) return <ErrorState error={me.error ?? profile.error} retry={() => { void me.refetch(); void profile.refetch(); }} />;

  const user = me.data;
  const achievements = profile.data?.achievements ?? [];
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <Screen onRefresh={() => { void me.refetch(); void profile.refetch(); }} refreshing={profile.isRefetching}>
      <Card style={styles.headerCard}>
        <View style={styles.header}>
          <Avatar name={user.displayName} url={user.avatarUrl} size={72} />
          <View style={styles.flex}>
            <AppText variant="heading" accessibilityRole="header">{user.displayName}</AppText>
            <AppText variant="caption" tone="secondary">@{user.username}</AppText>
            {!!user.bio && <AppText variant="caption" tone="secondary">{user.bio}</AppText>}
          </View>
        </View>
        <AvatarPicker user={user} />
      </Card>
      <Card><LevelSummary level={user.level} /></Card>

      <View style={styles.grid}>
        <StatCard icon="star-outline" value={formatNumber(user.level.totalXp)} label="Total XP" />
        <StatCard icon="flame-outline" value={`${user.currentStreak}`} label={`Streak (best ${user.longestStreak})`} tone="warning" />
        <StatCard icon="code-slash-outline" value={formatNumber(user.questionsAnswered)} label="Questions solved" />
        <StatCard icon="locate-outline" value={`${percent(user.accuracy)}%`} label="Accuracy" />
      </View>

      <Card style={styles.list}>
        <ListRow icon="trophy-outline" title="Leaderboard" subtitle={user.showOnLeaderboard ? `Global rank #${user.globalRank}` : "You are hidden from the leaderboards"} onPress={() => router.push("/leaderboard")} />
        <ListRow icon="key-outline" title="Password" subtitle="Change your password" onPress={() => router.push("/change-password")} />
      </Card>
      <Card style={styles.list}>
        <ListRow icon="document-text-outline" title={t.privacyTitle} subtitle={t.privacySubtitle} onPress={() => void openReference(PRIVACY_URL)} accessibilityHint={legal.openHint} />
        <ListRow icon="reader-outline" title={t.termsTitle} subtitle={t.termsSubtitle} onPress={() => void openReference(TERMS_URL)} accessibilityHint={legal.openHint} />
        <ListRow icon="trash-outline" tone="danger" title={t.deleteAccountTitle} subtitle={t.deleteAccountSubtitle} onPress={() => router.push("/delete-account")} />
      </Card>

      <SectionHeader title="Topic levels" />
      <Card style={styles.list}>
        {(profile.data?.topicProgress ?? []).filter((t) => t.questionsAnswered > 0).length === 0 && (
          <AppText tone="secondary" style={styles.pad}>Answer questions to start leveling up topics.</AppText>
        )}
        {(profile.data?.topicProgress ?? []).filter((t) => t.questionsAnswered > 0).map((t, i) => (
          <View key={t.topicSlug} style={styles.topic}>
            {i > 0 && <Divider />}
            <View style={styles.topicRow}>
              <TopicIcon name={t.icon} />
              <AppText variant="subheading" style={styles.flex} numberOfLines={1}>{t.topicName}</AppText>
              <AppText variant="mono" tone="primary">Lv {t.level.level}</AppText>
            </View>
            <ProgressBar value={t.level.progressPercent} label={`${t.topicName} level ${t.level.level} progress`} height={5} />
            <AppText variant="caption" tone="muted">{t.questionsAnswered} answered · {percent(t.accuracy)}% accuracy</AppText>
          </View>
        ))}
      </Card>

      <SectionHeader title={`Achievements (${unlocked}/${achievements.length})`} />
      <View style={styles.grid}>
        {achievements.map((a) => <AchievementTile key={a.code} achievement={a} />)}
      </View>

      <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={() => void signOut()} />
      <AppVersion />
    </Screen>
  );
}

function AchievementTile({ achievement: a }: { achievement: Achievement }) {
  return (
    <View
      style={[styles.badge, !a.unlocked && styles.badgeLocked]}
      accessible
      accessibilityLabel={`${a.name}, ${a.unlocked ? "unlocked" : "locked"}. ${a.description}. ${a.tier}, ${a.xpReward} XP`}
    >
      <View style={styles.badgeTop}>
        {a.unlocked ? <TopicIcon name={a.icon} size={22} /> : <Ionicons name="lock-closed" size={20} color={colors.textMuted} />}
        <View style={styles.tier}>
          <TierDot tier={a.tier} />
          <AppText variant="caption" tone="muted">{a.tier}</AppText>
        </View>
      </View>
      <AppText variant="subheading" tone={a.unlocked ? "default" : "muted"} numberOfLines={1}>{a.name}</AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={2}>{a.description}</AppText>
      <AppText variant="caption" tone={a.unlocked ? "primary" : "muted"}>{a.unlocked ? "Unlocked" : "Locked"} · +{a.xpReward} XP</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  flex: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  list: { paddingVertical: spacing.xs },
  pad: { paddingVertical: spacing.md },
  topic: { gap: spacing.xs, paddingBottom: spacing.sm },
  topicRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm },
  badge: { flexBasis: "47%", flexGrow: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
  badgeLocked: { opacity: 0.55, borderColor: colors.borderSubtle },
  badgeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tier: { flexDirection: "row", alignItems: "center", gap: 4 },
});
