"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthLayout } from "@/components/auth-ui";
import { api } from "@/lib/api";
import { useT } from "@/i18n";

type State = "working" | "done" | "failed";

/** Opened from the link in the confirmation email: confirms the address once and says whether it worked. */
function Confirm() {
  const params = useSearchParams();
  const t = useT().auth.confirmEmail;
  const email = params.get("email") ?? "";
  const code = params.get("code") ?? "";
  // A link without its address or code cannot work: say so at once instead of calling the API.
  const [state, setState] = useState<State>(email && code ? "working" : "failed");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;   // React runs effects twice in development; the code works once
    started.current = true;
    // The code is a credential: take it (and the address) out of the address bar and the history as soon as it is read.
    const url = new URL(window.location.href);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.hash}`);
    if (!email || !code) return;
    api.POST("/api/v1/auth/confirm-email", { body: { email, code } })
      .then(({ response }) => setState(response.ok ? "done" : "failed"))
      .catch(() => setState("failed"));
  }, [email, code]);

  return (
    <div className="space-y-5">
      {state === "working" && <p aria-busy="true" className="text-sm text-text-secondary">{t.working}</p>}
      {state === "done" && <p role="status" className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">{t.done}</p>}
      {state === "failed" && <p role="alert" className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">{t.failed}</p>}
      {state !== "working" && <Link href="/login" className="btn-primary w-full">{t.signIn}</Link>}
    </div>
  );
}

export default function ConfirmEmailPage() {
  const t = useT().auth.confirmEmail;
  return (
    <AuthLayout title={t.title} subtitle={t.subtitle}>
      <Suspense><Confirm /></Suspense>
    </AuthLayout>
  );
}
