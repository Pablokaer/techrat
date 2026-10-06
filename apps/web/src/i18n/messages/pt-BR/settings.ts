import type { Messages } from "../en";

export const settings: Messages["settings"] = {
  eyebrow: "Configurações",
  title: "Sua conta",
  signedInAs: (email) => `Conectado como ${email}`,
  profile: {
    heading: "Perfil público",
    displayName: "Nome de exibição",
    bio: "Bio",
    avatarUrl: "URL do avatar (https)",
    avatarPlaceholder: "https://…",
    save: "Salvar alterações",
    saving: "Salvando…",
    saved: "Perfil salvo",
    saveFailed: "Não foi possível salvar o perfil",
  },
  language: {
    heading: "Idioma",
    helper: "Escolha o idioma usado em todo o TechRat.",
  },
  connected: {
    heading: "Contas conectadas",
    text: "Login com GitHub, Google, Microsoft e Apple está nos planos. Seu progresso será mantido.",
  },
  session: {
    heading: "Sessão",
    signOut: "Sair",
  },
};
