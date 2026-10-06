import { StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing } from "@techrat/theme";
import type { RoadmapModule } from "@techrat/types";
import { alsoInText, moduleKindLabel } from "@/lib/format";
import { AppText, LabelBadge } from "@/components/ui";

/**
 * Heading of a roadmap module. Modules are reusable across roadmaps, so besides the title it explains
 * where else the module is used, whether progress was already earned in another roadmap, and its role
 * (optional, capstone, best practices). Every state is spelled out in text, never by color alone.
 */
export function ModuleHeader({ module: m }: { module: RoadmapModule }) {
  const kindLabel = moduleKindLabel(m.kind);
  const isCapstone = m.kind === "Capstone";
  const alsoIn = alsoInText(m.usedInRoadmaps.map((r) => r.name));
  const hasBadges = !!kindLabel || !m.isRequired || !!alsoIn;

  return (
    <View style={styles.gap}>
      <View style={styles.row}>
        <AppText variant="subheading" style={styles.flex} accessibilityRole="header">Module {m.order}: {m.title}</AppText>
        {m.isCompleted && !m.completedElsewhere && (
          <Ionicons name="checkmark-done" size={18} color={colors.primary} accessibilityLabel="Module completed" />
        )}
      </View>
      {hasBadges && (
        <View style={styles.badges}>
          {kindLabel && (
            <LabelBadge
              label={kindLabel}
              icon={isCapstone ? "trophy" : "ribbon-outline"}
              tone={isCapstone ? "solid" : "neutral"}
              accessibilityLabel={`${kindLabel} module`}
            />
          )}
          {!m.isRequired && (
            <LabelBadge label="Optional" tone="warning" accessibilityLabel="Optional module, not required to complete this roadmap" />
          )}
          {alsoIn && <LabelBadge label="Shared" icon="git-network-outline" tone="primary" accessibilityLabel="Shared module" />}
        </View>
      )}
      {alsoIn && <AppText variant="caption" tone="muted">{alsoIn}</AppText>}
      {m.completedElsewhere && (
        <View style={styles.row} accessible accessibilityLabel="Module already completed in another roadmap">
          <Ionicons name="checkmark-done-circle" size={16} color={colors.primary} />
          <AppText variant="caption" tone="primary" style={styles.strong}>Completed in another roadmap</AppText>
        </View>
      )}
      {!!m.description && <AppText variant="caption" tone="secondary">{m.description}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  flex: { flex: 1 },
  strong: { fontWeight: "600" },
});
