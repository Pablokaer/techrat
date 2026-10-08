import Constants from "expo-constants";
import { StyleSheet } from "react-native";
import { spacing } from "@techrat/theme";
import { AppText } from "@/components/ui";
import { useT } from "@/lib/i18n";

/**
 * The user-facing app version (`version` in app.json), shown at the bottom of Profile so support can ask "which
 * version are you on?". The Play Store `versionCode` is owned by EAS remote versioning and is not shown.
 */
export function AppVersion() {
  const t = useT();
  const version = Constants.expoConfig?.version;
  if (!version) return null;
  return <AppText variant="caption" tone="muted" style={styles.text}>{t.profile.version(version)}</AppText>;
}

const styles = StyleSheet.create({ text: { textAlign: "center", paddingVertical: spacing.sm } });
