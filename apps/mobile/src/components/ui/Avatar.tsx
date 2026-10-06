import { Image, StyleSheet, View } from "react-native";
import { colors } from "@techrat/theme";
import { initials } from "@/lib/format";
import { AppText } from "./AppText";

export function Avatar({ name, url, size = 56 }: { name: string; url?: string | null; size?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <Image source={{ uri: url }} style={[styles.base, shape]} accessibilityLabel={`${name} avatar`} />;
  return (
    <View style={[styles.base, styles.fallback, shape]} accessibilityLabel={`${name} avatar`}>
      <AppText variant="mono" tone="primary" style={{ fontSize: size * 0.36 }}>{initials(name)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, borderColor: colors.primary },
  fallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryMuted },
});
