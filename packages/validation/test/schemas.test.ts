import { describe, expect, it } from "vitest";
import { fieldErrors, loginSchema, registerSchema, resetPasswordSchema } from "../src";

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
