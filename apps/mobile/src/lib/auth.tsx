import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BearerSession } from "@techrat/auth";
import { unwrap } from "@techrat/api";
import type { RegisterInput } from "@techrat/validation";

type Status = "restoring" | "signedIn" | "signedOut";

interface AuthValue {
  status: Status;
  signIn(email: string, password: string): Promise<void>;
  /** Creates the account. It does NOT sign in: the API answers 202 and the person must follow the emailed link first. */
  register(input: RegisterInput): Promise<void>;
  /** Asks for the confirmation email again. The API always answers 202 (no account enumeration). */
  resendConfirmation(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Changes (or sets, with no current password) the password; other sessions are signed out, this one keeps going. */
  changePassword(currentPassword: string | null, newPassword: string): Promise<void>;
  /**
   * Permanently deletes the account. Accounts with a password send it; accounts without one send their own username
   * as confirmation. On success the session drops its tokens, so the route guard returns the app to the login screen.
   */
  deleteAccount(password: string | null, confirmation: string | null): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ session, children }: { session: BearerSession; children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("restoring");

  useEffect(() => {
    const off = session.onChange((signedIn) => {
      setStatus(signedIn ? "signedIn" : "signedOut");
      if (!signedIn) qc.clear();
    });
    session
      .restore()
      .then((ok) => setStatus(ok ? "signedIn" : "signedOut"))
      .catch(() => setStatus("signedOut"));
    return () => {
      off();
    };
  }, [session, qc]);

  const signIn = useCallback(async (email: string, password: string) => {
    await session.login(email.trim(), password);
  }, [session]);

  const register = useCallback(async (input: RegisterInput) => {
    await unwrap(
      session.api.POST("/api/v1/auth/register", {
        body: { email: input.email, username: input.username, password: input.password, displayName: input.displayName || null },
      }),
    );
  }, [session]);

  const resendConfirmation = useCallback(async (email: string) => {
    await unwrap(session.api.POST("/api/v1/auth/resend-confirmation", { body: { email: email.trim() } }));
  }, [session]);

  const signOut = useCallback(() => session.logout(), [session]);

  const changePassword = useCallback((currentPassword: string | null, newPassword: string) =>
    session.changePassword(currentPassword, newPassword), [session]);

  const deleteAccount = useCallback((password: string | null, confirmation: string | null) =>
    session.deleteAccount(password, confirmation), [session]);

  const value = useMemo(() => ({ status, signIn, register, resendConfirmation, signOut, changePassword, deleteAccount }),
    [status, signIn, register, resendConfirmation, signOut, changePassword, deleteAccount]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
