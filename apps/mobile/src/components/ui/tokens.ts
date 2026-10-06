import { Platform } from "react-native";
import { colors } from "@techrat/theme";
import { withAlpha } from "@/lib/format";

/** Native font stacks (the theme's CSS font strings are web-only). */
export const monoFont = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

/** Tints derived from theme tokens (never new hex values). */
export const tints = {
  primary: colors.primaryMuted,
  error: withAlpha(colors.error, 0.12),
  warning: withAlpha(colors.warning, 0.12),
  subtle: withAlpha(colors.text, 0.07),
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
