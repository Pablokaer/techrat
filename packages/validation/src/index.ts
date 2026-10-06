import { z } from "zod";

/** Every message the schemas can produce. Apps can translate them by key (see `fieldErrors`). */
export const VALIDATION_MESSAGES = {
  passwordMin: "At least 8 characters",
  passwordLower: "Include a lowercase letter",
  passwordUpper: "Include an uppercase letter",
  passwordDigit: "Include a number",
  username: "3-32 characters: letters, numbers or underscore",
  email: "Enter a valid email address",
  emailMax: "At most 256 characters",
  passwordRequired: "Enter your password",
  displayNameMin: "At least 2 characters",
  displayNameMax: "At most 40 characters",
  bioMax: "At most 280 characters",
  passwordsMismatch: "Passwords do not match",
  url: "Enter a valid URL",
  httpsUrl: "Use an https URL",
} as const;

export type ValidationMessageKey = keyof typeof VALIDATION_MESSAGES;
const M = VALIDATION_MESSAGES;

// Mirrors the backend rules (Identity password options + AuthValidation). The backend remains authoritative.
export const passwordSchema = z
  .string()
  .min(8, M.passwordMin)
  .regex(/[a-z]/, M.passwordLower)
  .regex(/[A-Z]/, M.passwordUpper)
  .regex(/[0-9]/, M.passwordDigit);

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,32}$/, M.username);

export const emailSchema = z.string().trim().email(M.email).max(256, M.emailMax);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, M.passwordRequired),
});

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: z.string().trim().min(2, M.displayNameMin).max(40, M.displayNameMax).optional().or(z.literal("")),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: M.passwordsMismatch, path: ["confirm"] });

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, M.displayNameMin).max(40, M.displayNameMax),
  bio: z.string().max(280, M.bioMax).optional(),
  avatarUrl: z.union([z.literal(""), z.string().url(M.url).startsWith("https://", M.httpsUrl)]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

const keyByMessage = new Map(Object.entries(VALIDATION_MESSAGES).map(([k, v]) => [v as string, k as ValidationMessageKey]));

/**
 * Flattens a zod error into { field: firstMessage } for simple form rendering.
 * Pass `translate` to localize the messages; it receives the message key (or null for an unknown message).
 */
export function fieldErrors(
  error: z.ZodError,
  translate?: (key: ValidationMessageKey | null, message: string) => string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= translate ? translate(keyByMessage.get(issue.message) ?? null, issue.message) : issue.message;
  }
  return out;
}
