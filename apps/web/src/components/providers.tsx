"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@techrat/api";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Award, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { I18nProvider, useT } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { AUTH_MODE, api, bearerSession, hubUrl, unwrap } from "@/lib/api";
import { invalidateProgress, qk, useMe } from "@/lib/queries";

// ------------------------------------------------------------------ toasts

type ToastKind = "success" | "error" | "info" | "achievement";
interface Toast { id: number; kind: ToastKind; title: string; body?: string }
const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastContext);

function ToastViewport({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  const t = useT();
  const icons = { success: CheckCircle2, error: XCircle, info: Info, achievement: Award };
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
      {toasts.map((toast) => {
        const Icon = icons[toast.kind];
        return (
          <div key={toast.id} role="status" className="animate-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border bg-card-raised p-4 shadow-2xl">
            <Icon className={toast.kind === "error" ? "h-5 w-5 text-error" : "h-5 w-5 text-primary"} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.body && <p className="mt-0.5 text-sm text-text-secondary">{toast.body}</p>}
            </div>
            <button onClick={() => dismiss(toast.id)} className="text-text-muted hover:text-text" aria-label={t.shell.dismissNotification}>
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ realtime (SignalR)

function Realtime() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useT();
  // Read the latest messages inside the long-lived SignalR handlers without reconnecting on a language switch.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const userId = me?.id;

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let connection: import("@microsoft/signalr").HubConnection | undefined;
    (async () => {
      try {
        const signalR = await import("@microsoft/signalr");
        connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl(), {
            withCredentials: AUTH_MODE === "cookie",
            accessTokenFactory: bearerSession ? async () => (await bearerSession!.getAccessToken()) ?? "" : undefined,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.None)
          .build();
        connection.on("achievementUnlocked", async (a: { code?: string; name: string; xpReward: number }) => {
          // The event is raised in the background (no request language), so look the name up in the user's language.
          let name = a.name;
          try {
            const list = await qc.fetchQuery({ queryKey: qk.achievements, queryFn: () => unwrap(api.GET("/api/v1/achievements")) });
            name = list.find((x) => x.code === a.code)?.name ?? name;
          } catch {
            /* keep the name from the event */
          }
          toast({ kind: "achievement", title: tRef.current.shell.achievementUnlocked(name), body: tRef.current.common.plusXp(a.xpReward) });
          invalidateProgress(qc);
        });
        connection.on("progressUpdated", () => qc.invalidateQueries({ queryKey: qk.dashboard }));
        if (!stopped) await connection.start();
      } catch {
        // Realtime is an enhancement; polling (notifications refetch) covers failures.
      }
    })();
    return () => {
      stopped = true;
      void connection?.stop();
    };
  }, [userId, qc, toast]);
  return null;
}

// ------------------------------------------------------------------ root

export function Providers({
  children,
  client: injected,
  initialLocale,
  detectLocale = false,
}: {
  children: ReactNode;
  client?: QueryClient;
  /** Locale chosen by the server for this request (web). */
  initialLocale?: Locale;
  /** Detect the locale in the browser after mount (desktop static export). */
  detectLocale?: boolean;
}) {
  const [client] = useState(
    () =>
      injected ?? new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, error) => !isApiError(error) && count < 2,
          },
        },
      }),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );
  const [ready, setReady] = useState(AUTH_MODE === "cookie");
  useEffect(() => {
    if (bearerSession) void bearerSession.restore().finally(() => setReady(true));
  }, []);
  const value = useMemo(() => push, [push]);
  // Catalog names and server messages come back in the request language, so refetch everything on a switch.
  const onLocaleChange = useCallback(() => void client.invalidateQueries(), [client]);

  return (
    <I18nProvider initialLocale={initialLocale} detect={detectLocale} onLocaleChange={onLocaleChange}>
      <QueryClientProvider client={client}>
        <ToastContext.Provider value={value}>
          {ready ? children : null}
          {ready && <Realtime />}
          <ToastViewport toasts={toasts} dismiss={dismiss} />
        </ToastContext.Provider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
