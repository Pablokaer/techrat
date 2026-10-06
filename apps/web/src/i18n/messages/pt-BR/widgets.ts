import type { Messages } from "../en";

export const widgets: Messages["widgets"] = {
  viewAll: "Ver tudo",
  levelShort: (n) => `Nv ${n}`,
  completion: (topic) => `Conclusão de ${topic}`,
  stepStatus: {
    completed: "Concluído",
    inProgress: "Em andamento",
    locked: "Bloqueado",
  },
  pleaseTryAgain: "Tente novamente.",
  retry: "Tentar de novo",
};
