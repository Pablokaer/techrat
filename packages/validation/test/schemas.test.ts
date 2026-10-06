import { describe, expect, it } from "vitest";
import { VALIDATION_MESSAGES, changePasswordSchema, fieldErrors, loginSchema, registerSchema, resetPasswordSchema } from "../src";

describe("validation", () => {
  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse({ email: "a@b.io", username: "alex_dev", displayName: "", password: "Passw0rdX" }).success).toBe(true);
  });
  it("mirrors backend password rules", () => {
    const r = registerSchema.safeParse({ email: "a@b.io", username: "alex", password: "password1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).password).toBe("Include an uppercase letter");
  });
  it("rejects bad usernames and emails", () => {
    const r = registerSchema.safeParse({ email: "nope", username: "a b", password: "Passw0rdX" });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(["email", "username"]);
  });
  it("requires matching passwords on reset", () => {
    expect(resetPasswordSchema.safeParse({ password: "Passw0rdX", confirm: "Passw0rdY" }).success).toBe(false);
  });
  it("login needs both fields", () => {
    expect(loginSchema.safeParse({ email: "a@b.io", password: "" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const ok = { current: "OldPassw0rd", password: "N3wPassword", confirm: "N3wPassword" };
  const messages = (schema: ReturnType<typeof changePasswordSchema>, value: object) => {
    const r = schema.safeParse(value);
    // First message per field, like fieldErrors.
    return r.success ? {} : Object.fromEntries([...r.error.issues].reverse().map((i) => [i.path.join("."), i.message]));
  };

  it("accepts a valid change", () => {
    expect(changePasswordSchema(true).safeParse(ok).success).toBe(true);
  });

  it("requires the current password and reuses the sign-up rules for the new one", () => {
    expect(messages(changePasswordSchema(true), { ...ok, current: "" })).toMatchObject({ current: VALIDATION_MESSAGES.currentPasswordRequired });
    expect(messages(changePasswordSchema(true), { ...ok, password: "weak", confirm: "weak" })).toMatchObject({ password: VALIDATION_MESSAGES.passwordMin });
  });

  it("checks the confirmation and that the new password differs from the current one", () => {
    expect(messages(changePasswordSchema(true), { ...ok, confirm: "Other1234" })).toMatchObject({ confirm: VALIDATION_MESSAGES.passwordsMismatch });
    expect(messages(changePasswordSchema(true), { ...ok, password: ok.current, confirm: ok.current })).toMatchObject({ password: VALIDATION_MESSAGES.passwordSameAsCurrent });
  });

  it("needs no current password when the account has none (external sign-in)", () => {
    expect(changePasswordSchema(false).safeParse({ ...ok, current: "" }).success).toBe(true);
  });
});
