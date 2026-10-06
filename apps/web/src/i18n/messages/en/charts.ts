export const charts = {
  accuracy: "Accuracy",
  accuracyByDifficulty: (items: string) => `Accuracy by difficulty: ${items}`,
  accuracyValue: (pct: number, answered: number) => `${pct}% (${answered} answered)`,
  overLastDays: (label: string, days: number) => `${label} over the last ${days} days`,
};
