import type { Messages } from "../en";

export const shell: Messages["shell"] = {
  dismissNotification: "Dispensar notificação",
  achievementUnlocked: (name) => `Conquista desbloqueada: ${name}`,
  home: "Início do TechRat",
  loadingApp: "Carregando o TechRat",
  mainNav: "Principal",
  nav: {
    dashboard: "Painel",
    learn: "Aprender",
    practice: "Praticar",
    roadmaps: "Roadmaps",
    analytics: "Estatísticas",
    leaderboard: "Ranking",
    community: "Comunidade",
    settings: "Configurações",
    admin: "Admin",
    home: "Início",
    profile: "Perfil",
  },
  motto: ["SIGA O", "TECHRAT", "EM VOCÊ"],
  search: {
    label: "Buscar tópicos, roadmaps e tecnologias",
    placeholder: "Busque tópicos, tecnologias ou roadmaps…",
    type: { Topic: "Tópico", Subtopic: "Subtópico", Roadmap: "Roadmap" },
  },
  notifications: {
    title: "Notificações",
    label: (unread) => `Notificações${unread ? `, ${unread} não ${unread === 1 ? "lida" : "lidas"}` : ""}`,
    markAllRead: "Marcar todas como lidas",
    empty: "Nenhuma notificação ainda. Vá ganhar XP!",
  },
  account: {
    menu: "Menu da conta",
    profile: "Perfil",
    settings: "Configurações",
    admin: "Admin",
    signOut: "Sair",
  },
  streak: {
    title: "Sequência de dias",
    srLabel: "dias seguidos",
  },
  totalXp: "XP total",
};
