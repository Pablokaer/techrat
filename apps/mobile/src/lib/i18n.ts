/**
 * Minimal i18n for the mobile app (English and Brazilian Portuguese), added with the Play Store release work.
 *
 * Only the screens written since then use it: the rest of the app is still English-only (see "Known limitations" in
 * the README). The active locale is the device's, read once at startup, so there is no provider or switcher: the
 * messages are plain objects, and `Messages` is derived from the English object so the compiler fails when the
 * Portuguese one lacks a text (i18n.test.ts also checks the shape at run time).
 */

export const LOCALES = ["en", "pt-BR"] as const;
export type Locale = (typeof LOCALES)[number];

/** Any Portuguese variant maps to pt-BR; anything else falls back to English. */
export function matchLocale(tags: readonly string[]): Locale {
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag.startsWith("pt")) return "pt-BR";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

/** The device language, through Intl (available in Hermes), without an extra native dependency. */
function detectLocale(): Locale {
  try {
    return matchLocale([Intl.DateTimeFormat().resolvedOptions().locale]);
  } catch {
    return "en";
  }
}

let current: Locale = detectLocale();

export const getLocale = (): Locale => current;
/** For tests and for a future language setting. */
export const setLocale = (locale: Locale) => {
  current = locale;
};

const en = {
  emailConfirmation: {
    registerIntro: "Join TechRat and start earning XP for everything you learn.",
    checkTitle: "Check your email",
    checkBody: (email: string) => `We sent a confirmation link to ${email}. It works for 24 hours. If you cannot find it, check your spam folder.`,
    resend: "Resend the email",
    resendSent: "If the address has an unconfirmed account, we sent a new link.",
    resendFailed: "Could not send the email. Please try again in a minute.",
    goToSignIn: "Go to sign in",
    resendFromLogin: "Resend confirmation email",
    enterEmail: "Enter your email above first.",
  },
  profile: {
    version: (version: string) => `Version ${version}`,
    deleteAccountTitle: "Delete account",
    deleteAccountSubtitle: "Permanently delete your account and data",
    privacyTitle: "Privacy policy",
    privacySubtitle: "How we handle your data",
    termsTitle: "Terms of service",
    termsSubtitle: "The rules for using TechRat",
  },
  legal: {
    privacyPolicy: "Privacy policy",
    termsOfService: "Terms of service",
    openHint: "Opens in the browser",
    consent: {
      before: "By creating an account you agree to the ",
      terms: "Terms of Service",
      between: " and the ",
      privacy: "Privacy Policy",
      after: ".",
    },
  },
  deleteAccount: {
    loading: "Loading",
    intro: "Deleting your account is permanent and cannot be undone.",
    deletedHeading: "What will be deleted",
    deletedItems: [
      "Your profile: name, username, email, bio and photo",
      "Your sign-in credentials and every session on all your devices",
      "Your practice history, answers, XP, levels, streaks and achievements",
      "Your roadmap and topic progress and your notifications",
    ],
    noRecovery: "We cannot restore any of this afterwards. Backups made earlier may take a while to expire.",
    passwordLabel: "Current password",
    passwordHint: "Enter your password to confirm it is you.",
    usernameLabel: "Type your username to confirm",
    usernameHintGeneric: "Your account has no password, so type your own username to confirm.",
    passwordRequired: "Enter your password.",
    usernameRequired: "Enter your username.",
    deleteButton: "Delete my account",
    deleteButtonHint: "Asks you to confirm before deleting anything",
    confirmTitle: "Are you sure?",
    confirmBody: "Your account and all its data will be deleted right now. This cannot be undone.",
    confirmButton: "Yes, delete permanently",
    cancelButton: "Cancel",
    lastAdmin: "You are the last administrator, so the account cannot be deleted. Make someone else an administrator first.",
    tooManyAttempts: "Too many attempts. Wait a minute and try again.",
    failed: "Could not delete the account. Check your connection and try again.",
  },
};

export type Messages = typeof en;

const ptBR: Messages = {
  emailConfirmation: {
    registerIntro: "Entre no TechRat e ganhe XP por tudo o que você aprende.",
    checkTitle: "Confira seu e-mail",
    checkBody: (email) => `Enviamos um link de confirmação para ${email}. Ele vale por 24 horas. Se não encontrar a mensagem, olhe na caixa de spam.`,
    resend: "Reenviar o e-mail",
    resendSent: "Se o endereço tiver uma conta não confirmada, enviamos um novo link.",
    resendFailed: "Não foi possível enviar o e-mail. Tente novamente em um minuto.",
    goToSignIn: "Ir para o login",
    resendFromLogin: "Reenviar e-mail de confirmação",
    enterEmail: "Digite seu e-mail acima primeiro.",
  },
  profile: {
    version: (version) => `Versão ${version}`,
    deleteAccountTitle: "Excluir conta",
    deleteAccountSubtitle: "Exclua sua conta e seus dados permanentemente",
    privacyTitle: "Política de privacidade",
    privacySubtitle: "Como tratamos seus dados",
    termsTitle: "Termos de uso",
    termsSubtitle: "As regras para usar o TechRat",
  },
  legal: {
    privacyPolicy: "Política de privacidade",
    termsOfService: "Termos de uso",
    openHint: "Abre no navegador",
    consent: {
      before: "Ao criar uma conta, você concorda com os ",
      terms: "Termos de Uso",
      between: " e com a ",
      privacy: "Política de Privacidade",
      after: ".",
    },
  },
  deleteAccount: {
    loading: "Carregando",
    intro: "Excluir sua conta é permanente e não pode ser desfeito.",
    deletedHeading: "O que será excluído",
    deletedItems: [
      "Seu perfil: nome, nome de usuário, e-mail, bio e foto",
      "Suas credenciais de acesso e todas as sessões em todos os seus dispositivos",
      "Seu histórico de prática, respostas, XP, níveis, sequências e conquistas",
      "Seu progresso em roadmaps e tópicos e suas notificações",
    ],
    noRecovery: "Não conseguimos restaurar nada disso depois. Backups feitos antes podem levar um tempo para expirar.",
    passwordLabel: "Senha atual",
    passwordHint: "Digite sua senha para confirmar que é você.",
    usernameLabel: "Digite seu nome de usuário para confirmar",
    usernameHintGeneric: "Sua conta não tem senha, então digite o seu próprio nome de usuário para confirmar.",
    passwordRequired: "Digite sua senha.",
    usernameRequired: "Digite seu nome de usuário.",
    deleteButton: "Excluir minha conta",
    deleteButtonHint: "Pede uma confirmação antes de excluir qualquer coisa",
    confirmTitle: "Tem certeza?",
    confirmBody: "Sua conta e todos os seus dados serão excluídos agora. Isso não pode ser desfeito.",
    confirmButton: "Sim, excluir permanentemente",
    cancelButton: "Cancelar",
    lastAdmin: "Você é o último administrador, então a conta não pode ser excluída. Torne outra pessoa administradora primeiro.",
    tooManyAttempts: "Muitas tentativas. Aguarde um minuto e tente novamente.",
    failed: "Não foi possível excluir a conta. Verifique sua conexão e tente novamente.",
  },
};

export const translations: Record<Locale, Messages> = { en, "pt-BR": ptBR };

/** The messages of the active locale. */
export const messages = (): Messages => translations[current];

/** React hook form of `messages()`: the locale is fixed for the app's lifetime, so it never needs to re-render. */
export const useT = messages;

/** fetch that tells the API which language to answer in (validation messages, emails). */
export const localizedFetch: typeof fetch = (input, init) => {
  const request = new Request(input, init);
  request.headers.set("Accept-Language", current);
  return fetch(request);
};
