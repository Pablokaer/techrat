import type { Messages } from "../en";

export const leaderboard: Messages["leaderboard"] = {
  eyebrow: "Suba no ranking",
  title: "Ranking",
  subtitle: {
    Global: "XP de todos os tempos.",
    Weekly: "XP ganho desde segunda-feira (UTC).",
    Monthly: "XP ganho este mês.",
    Topic: "XP por tópico — aqui os especialistas brilham.",
  },
  scopeLabel: "Escopo do ranking",
  scopes: {
    Global: "Geral",
    Weekly: "Semanal",
    Monthly: "Mensal",
    Topic: "Por tópico",
  },
  topic: "Tópico",
  you: "Você",
  emptyTitle: "Ninguém aqui ainda",
  emptyText: "Seja o primeiro a ganhar XP neste ranking.",
  startPracticing: "Começar a praticar",
  columns: {
    rank: "Posição",
    learner: "Aluno",
    level: "Nível",
    xp: "XP",
    questions: "Questões",
    accuracy: "Precisão",
  },
  pagination: "Paginação",
  pageOf: (page, pages) => `Página ${page} de ${pages}`,
  levelShort: (n) => `Nv ${n}`,
};
