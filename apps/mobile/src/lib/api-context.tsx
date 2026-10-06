import { createContext, useContext, type ReactNode } from "react";
import type { TechRatClient } from "@techrat/api";

const ApiContext = createContext<TechRatClient | null>(null);

/** Provides the typed API client. Tests inject a client backed by a mocked fetch. */
export function ApiProvider({ client, children }: { client: TechRatClient; children: ReactNode }) {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): TechRatClient {
  const client = useContext(ApiContext);
  if (!client) throw new Error("useApi must be used inside <ApiProvider>");
  return client;
}
