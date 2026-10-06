import { Image, StyleSheet, View } from "react-native";
import { brand, spacing } from "@techrat/theme";
import { AppText } from "@/components/ui";

export function AuthHeader({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.wrap}>
      <Image source={require("../../../assets/rat.png")} style={styles.logo} accessibilityIgnoresInvertColors accessible={false} />
      <AppText variant="title" accessibilityRole="header">{brand.name}</AppText>
      <AppText variant="eyebrow" tone="primary">{brand.tagline.join(" · ")}</AppText>
      <AppText tone="secondary" style={styles.subtitle}>{subtitle}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.lg },
  logo: { width: 120, height: 120 },
  subtitle: { textAlign: "center" },
});
