import type { Messages } from "../en";

export const dashboard: Messages["dashboard"] = {
  greeting: { morning: "Bom dia", afternoon: "Boa tarde", evening: "Boa noite" },
  eyebrow: "Sua jornada de aprendizado, gamificada",
  tagline: "Continue aprendendo. Pequenos passos formam grandes devs.",
  dayStreak: "Dias seguidos",
  levelProgress: "Progresso do nível",
  xpProgress: (current, total) => `${current} / ${total} XP`,
  stats: {
    totalXp: "XP total",
    questionsSolved: "Questões resolvidas",
    accuracy: "Precisão",
    globalRank: "Posição geral",
  },
  continueLearning: {
    title: "Continue aprendendo",
    cta: "Ver todos os tópicos",
  },
  roadmap: {
    title: "Seu roadmap de aprendizado",
    viewFull: "Ver roadmap completo",
    choose: "Escolher um roadmap",
    progress: (completed, total, percent) => `${completed} de ${total} etapas · ${percent}%`,
    progressLabel: "Progresso do roadmap",
    emptyTitle: "Escolha um caminho e comece a subir de nível",
    emptyText: "Roadmaps estruturados, de Engenheiro de Software Júnior a System Design e Engenharia de IA, montados com módulos compartilhados.",
    browse: "Ver roadmaps",
  },
  recommended: {
    title: "Prática recomendada",
  },
  daily: {
    title: "Desafio diário",
    questions: (n) => (n === 1 ? "1 questão variada" : `${n} questões variadas`),
    descriptionBefore: "Uma por tópico, renovadas todo dia. Bônus de ",
    descriptionAfter: " uma vez por dia.",
    progressLabel: "Progresso do desafio diário",
    completedToday: (correct, total) => `Concluído hoje · ${correct}/${total} corretas`,
    resume: "Retomar desafio",
    start: "Começar desafio",
    startError: "Não foi possível começar o desafio diário",
  },
  achievements: {
    title: "Conquistas recentes",
    empty: "Responda sua primeira questão para desbloquear seu primeiro emblema.",
  },
};
