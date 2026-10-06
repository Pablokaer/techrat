import type { Locale } from "../config";
import { en, type Messages } from "./en";
import { ptBR } from "./pt-BR";

export type { Messages };
export const messages: Record<Locale, Messages> = { en, "pt-BR": ptBR };
