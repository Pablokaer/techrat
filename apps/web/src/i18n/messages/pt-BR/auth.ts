import type { Messages } from "../en";

export const auth: Messages["auth"] = {
  layout: {
    slogan: ["SIGA O", "TECHRAT", "EM VOCÊ"],
    tagline: "Uma plataforma de aprendizado gamificada para quem vai construir o futuro.",
    motto: { learn: "APRENDA", practice: "PRATIQUE", levelUp: "SUBA DE NÍVEL" },
    pillars: {
      practice: { title: "Praticar", text: "Questões do mundo real" },
      learn: { title: "Aprender", text: "Roadmaps estruturados" },
      levelUp: { title: "Evoluir", text: "Ganhe XP e emblemas" },
      grow: { title: "Crescer", text: "Acompanhe seu progresso e suba no ranking" },
    },
  },
  oauth: {
    or: "ou",
    continueWithGithub: "Continuar com GitHub",
    soon: "(em breve)",
    githubComingSoon: "Login com GitHub em breve",
  },
  fields: {
    email: "E-mail",
    password: "Senha",
    username: "Nome de usuário",
    displayName: "Nome de exibição",
    newPassword: "Nova senha",
    confirmPassword: "Confirmar senha",
  },
  login: {
    title: "Bem-vindo de volta",
    subtitle: "Mantenha sua sequência. Pequenos passos formam grandes desenvolvedores.",
    passwordUpdated: "Senha atualizada. Entre com sua nova senha.",
    forgotPassword: "Esqueceu a senha?",
    submit: "Entrar",
    submitting: "Entrando…",
    newHere: "Novo no TechRat?",
    createAccount: "Criar conta",
  },
  register: {
    title: "Crie sua conta",
    subtitle: "Junte-se a quem sobe de nível todos os dias.",
    usernamePlaceholder: "alex_dev",
    displayNamePlaceholder: "Alex",
    passwordHint: "8+ caracteres com letras maiúsculas, minúsculas e um número.",
    submit: "Criar conta",
    submitting: "Criando conta…",
    haveAccount: "Já tem uma conta?",
    signIn: "Entrar",
  },
  forgotPassword: {
    title: "Redefina sua senha",
    subtitle: "Enviaremos um link por e-mail para você escolher uma nova.",
    sent: "Se existir uma conta com esse e-mail, um link de redefinição está a caminho.",
    submit: "Enviar link",
    remembered: "Lembrou?",
    backToSignIn: "Voltar para o login",
  },
  resetPassword: {
    title: "Escolha uma nova senha",
    subtitle: "Capriche. Seu eu do futuro vai agradecer.",
    invalidLink: "Este link de redefinição é inválido ou expirou. Solicite um novo.",
    submit: "Atualizar senha",
  },
};
