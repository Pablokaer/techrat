import type { Messages } from "../en";

export const analytics: Messages["analytics"] = {
  eyebrow: "Analise",
  title: "Suas estatísticas de aprendizado",
  subtitle: "Descubra seus pontos fortes e fracos, e o quão rápido você está evoluindo.",
  periodLabel: "Período",
  periodDays: (n) => (n === 1 ? "1 dia" : `${n} dias`),
  stats: {
    accuracy: (answered) => `Precisão · ${answered} respondidas`,
    xpInDays: (days) => (days === 1 ? "XP em 1 dia" : `XP em ${days} dias`),
    studyTime: "Tempo total de estudo",
    streak: (best) => `Dias seguidos · recorde ${best}`,
  },
  accuracyByDifficulty: {
    title: "Precisão por dificuldade",
    subtitle: "Sua taxa de precisão em cada nível de dificuldade.",
  },
  velocity: {
    title: "Velocidade de progresso",
    subtitle: "XP nos últimos 7 dias vs os 7 anteriores.",
    last7: "Últimos 7 dias",
    previous7: "7 dias anteriores",
    xpPerDay: "XP por dia",
  },
  chartXp: "XP",
  questionsPerDay: "Questões por dia",
  chartQuestions: "Questões",
  strongest: {
    title: "Tópicos mais fortes",
    empty: "Responda 5+ questões de um tópico para ver seus pontos fortes.",
  },
  weakest: {
    title: "Tópicos mais fracos",
    empty: "Nenhum ponto fraco detectado ainda.",
  },
  answered: (n) => (n === 1 ? "1 respondida" : `${n} respondidas`),
  practice: "Praticar",
  byTopic: "Precisão por tópico",
  bySubtopic: "Precisão por subtópico",
  noAnswers: "Nenhuma resposta ainda.",
  accuracyOf: (name) => `Precisão em ${name}`,
};
