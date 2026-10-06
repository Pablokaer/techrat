import type { Messages } from "../en";

export const charts: Messages["charts"] = {
  accuracy: "Precisão",
  accuracyByDifficulty: (items) => `Precisão por dificuldade: ${items}`,
  accuracyValue: (pct, answered) => `${pct}% (${answered} ${answered === 1 ? "respondida" : "respondidas"})`,
  overLastDays: (label, days) => `${label} nos últimos ${days} dias`,
};
