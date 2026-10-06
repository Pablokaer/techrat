import { Image, StyleSheet, View } from "react-native";
import { colors } from "@techrat/theme";
import { resolveMediaUrl } from "@techrat/api";
import { API_URL } from "@/lib/config";
import { initials } from "@/lib/format";
import { AppText } from "./AppText";

/** A user's photo, or their initials. Uploaded photos are API-relative URLs, resolved against the API host. */
export function Avatar({ name, url, size = 56 }: { name: string; url?: string | null; size?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const src = resolveMediaUrl(url, API_URL);
  if (src) return <Image source={{ uri: src }} style={[styles.base, shape]} accessibilityLabel={`${name} avatar`} />;
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
