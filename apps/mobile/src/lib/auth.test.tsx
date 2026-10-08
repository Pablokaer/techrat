import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BearerSession } from "@techrat/auth";
import { AuthProvider, useAuth } from "./auth";

function fakeSession() {
  return {
    onChange: jest.fn(() => () => undefined),
    restore: jest.fn(() => Promise.resolve(false)),
    deleteAccount: jest.fn(() => Promise.resolve()),
  };
}

async function setup(session: ReturnType<typeof fakeSession>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider session={session as unknown as BearerSession}>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe("AuthProvider.deleteAccount", () => {
  it("delegates to the session with the password", async () => {
    const session = fakeSession();
    const { result } = await setup(session);
    await result.current.deleteAccount("Passw0rd!", null);
    expect(session.deleteAccount).toHaveBeenCalledWith("Passw0rd!", null);
  });

  it("delegates the typed username for accounts without a password", async () => {
    const session = fakeSession();
    const { result } = await setup(session);
    await result.current.deleteAccount(null, "rat");
    expect(session.deleteAccount).toHaveBeenCalledWith(null, "rat");
  });

  it("lets the API error reach the caller", async () => {
    const session = fakeSession();
    session.deleteAccount.mockRejectedValueOnce(new Error("nope"));
    const { result } = await setup(session);
    await expect(result.current.deleteAccount("x", null)).rejects.toThrow("nope");
  });
});
