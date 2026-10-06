import type { Messages } from "../en";

export const learn: Messages["learn"] = {
  eyebrow: "Árvore de conhecimento",
  title: "Aprender",
  subtitle: (n) => `${n} tópicos, dos fundamentos de programação à engenharia de IA. Todo tópico tem questões Fáceis, Médias, Difíceis e Expert.`,
  allCategories: "Todos",
  categoriesLabel: "Categorias de tópicos",
  levelShort: (n) => `Nv ${n}`,
  completionLabel: (name) => `Conclusão de ${name}`,
  questionsShort: (n) => `${n} q`,
  subtopicsCount: (n) => (n === 1 ? "1 subtópico" : `${n} subtópicos`),
  topic: {
    notFound: "Tópico não encontrado",
    practice: (name) => `Praticar ${name}`,
    topicLevel: "Nível do tópico",
    levelProgress: "Progresso do nível do tópico",
    toNextLevel: (xp, next) => `${xp} XP · faltam ${next} para o próximo nível`,
    answered: "Respondidas",
    accuracy: "Precisão",
    byDifficulty: "Por dificuldade",
    answeredAvailable: (answered, available) => `${answered} respondidas · ${available} disponíveis`,
    subtopics: "Subtópicos",
    accuracyLabel: (name) => `Precisão em ${name}`,
    new: "novo",
  },
};
