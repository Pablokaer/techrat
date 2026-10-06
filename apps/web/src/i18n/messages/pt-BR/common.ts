import type { Messages } from "../en";

export const common: Messages["common"] = {
  appName: "TechRat",
  loading: "Carregando",
  retry: "Tentar novamente",
  save: "Salvar",
  saving: "Salvando…",
  cancel: "Cancelar",
  close: "Fechar",
  back: "Voltar",
  next: "Próxima",
  previous: "Anterior",
  seeAll: "Ver tudo",
  xp: (n) => `${n} XP`,
  plusXp: (n) => `+${n} XP`,
  level: (n) => `Nível ${n}`,
  networkError: "Não foi possível conectar ao TechRat. Tente novamente.",
  somethingWentWrong: "Algo deu errado",
  difficulty: { Easy: "Fácil", Medium: "Média", Hard: "Difícil", Expert: "Expert" },
  roadmapDifficulty: { Beginner: "Iniciante", Intermediate: "Intermediário", Advanced: "Avançado", Expert: "Expert" },
  tier: { Bronze: "Bronze", Silver: "Prata", Gold: "Ouro", Platinum: "Platina" },
  language: {
    label: "Idioma",
    choose: "Escolher idioma",
  },
};
