import type { Messages } from "../en";

export const validation: Messages["validation"] = {
  passwordMin: "Pelo menos 8 caracteres",
  passwordLower: "Inclua uma letra minúscula",
  passwordUpper: "Inclua uma letra maiúscula",
  passwordDigit: "Inclua um número",
  username: "3 a 32 caracteres: letras, números ou sublinhado",
  email: "Informe um e-mail válido",
  emailMax: "No máximo 256 caracteres",
  passwordRequired: "Informe sua senha",
  displayNameMin: "Pelo menos 2 caracteres",
  displayNameMax: "No máximo 40 caracteres",
  bioMax: "No máximo 280 caracteres",
  passwordsMismatch: "As senhas não coincidem",
  url: "Informe uma URL válida",
  httpsUrl: "Use uma URL https",
  invalid: "Valor inválido",
};
