import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BearerSession } from "@techrat/auth";
import { unwrap } from "@techrat/api";
import type { RegisterInput } from "@techrat/validation";

type Status = "restoring" | "signedIn" | "signedOut";

interface AuthValue {
  status: Status;
  signIn(email: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  signOut(): Promise<void>;
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
    await session.login(input.email, input.password);
  }, [session]);

  const signOut = useCallback(() => session.logout(), [session]);

  const value = useMemo(() => ({ status, signIn, register, signOut }), [status, signIn, register, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
