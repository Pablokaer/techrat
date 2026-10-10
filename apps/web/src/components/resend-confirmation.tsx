"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useT } from "@/i18n";

/**
 * "Send the confirmation email again". The answer never says whether the address has an account (the API answers 202
 * for everybody), so neither does this: it only says that a link is on its way if one was due.
 */
export function ResendConfirmation({ email, label }: { email: string; label: string }) {
  const t = useT();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function resend() {
    setPending(true);
    try {
      await api.POST("/api/v1/auth/resend-confirmation", { body: { email } });
    } catch {
      // A network error looks the same as success here: asking again is always allowed.
    }
    setPending(false);
    setSent(true);
  }

  return (
    <div className="space-y-3">
      <button type="button" className="btn-secondary w-full" onClick={resend} disabled={pending}>{label}</button>
      {sent && <p role="status" className="rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-sm text-primary">{t.auth.confirmationResent}</p>}
    </div>
  );
}
