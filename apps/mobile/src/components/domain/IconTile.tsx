import { StyleSheet, View } from "react-native";
import { colors, radii } from "@techrat/theme";
import { TopicIcon } from "./TopicIcon";

export function IconTile({ icon, size = 40, muted }: { icon?: string | null; size?: number; muted?: boolean }) {
  return (
    <View style={[styles.tile, { width: size, height: size }, muted && styles.muted]}>
      <TopicIcon name={icon} size={size * 0.5} color={muted ? colors.textMuted : colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radii.md, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  muted: { backgroundColor: colors.cardRaised },
});
