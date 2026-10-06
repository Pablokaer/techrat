import { StyleSheet, Text, type TextProps } from "react-native";
import { colors } from "@techrat/theme";
import { monoFont } from "./tokens";

type Variant = "title" | "heading" | "subheading" | "body" | "caption" | "eyebrow" | "mono";
type Tone = "default" | "secondary" | "muted" | "primary" | "error" | "warning";

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

const toneColor: Record<Tone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  primary: colors.primary,
  error: colors.error,
  warning: colors.warning,
};

export function AppText({ variant = "body", tone = "default", style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[styles[variant], { color: toneColor[tone] }, style]} />;
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", lineHeight: 32 },
  heading: { fontSize: 19, fontWeight: "700", lineHeight: 25 },
  subheading: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 13, lineHeight: 18 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  mono: { fontFamily: monoFont, fontSize: 14, fontWeight: "700" },
});
