/**
 * TechRat design tokens — shared by web (Tailwind/CSS variables), desktop and mobile (React Native StyleSheet).
 * Black first, white text, Matrix green used sparingly for action, selection, progress and XP.
 */
export const colors = {
  background: "#000000",
  backgroundSecondary: "#080B09",
  card: "#0D120F",
  cardRaised: "#111814",
  border: "#17351F",
  borderSubtle: "#122016",
  primary: "#00FF41",
  primarySecondary: "#00C832",
  primaryMuted: "rgba(0, 255, 65, 0.12)",
  text: "#FFFFFF",
  textSecondary: "#A7B0AA",
  textMuted: "#6E7872",
  warning: "#FFB020",
  error: "#FF4E4E",
  success: "#00FF41",
  expert: "#B57BFF",
  onPrimary: "#001A07",
} as const;

export const difficultyColors = {
  Easy: colors.primarySecondary,
  Medium: colors.warning,
  Hard: colors.error,
  Expert: colors.expert,
} as const;

export const tierColors = {
  Bronze: "#D08A4E",
  Silver: "#C9D1CC",
  Gold: "#FFC93C",
  Platinum: "#7FE7FF",
} as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fonts = {
  sans: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export const brand = {
  name: "TechRat",
  tagline: ["Learn", "Practice", "Level Up"] as const,
  motto: "Follow the TechRat in you",
} as const;

export type Difficulty = keyof typeof difficultyColors;
