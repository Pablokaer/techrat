"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@techrat/api";
import { deleteAccount } from "@/lib/api";
import { useMe, usePasswordStatus } from "@/lib/queries";
import { AlertDialog } from "@/components/alert-dialog";
import { useT } from "@/i18n";

/** Query flag that makes the login page announce the deletion once (see the login page). */
export const ACCOUNT_DELETED_HREF = "/login?deleted=1";

/**
 * What is deleted and the danger button that opens the confirmation dialog. Shared by Settings and the public
 * `/account/delete` page (the URL given to Google Play), so both behave identically.
 *
 * Accounts with a password prove it with the password (the API counts wrong attempts towards lockout); accounts created
 * through an external provider have none and type their username instead. On success the server has already ended the
 * session, so we only drop every cached query (nothing of the former user may linger in memory) and go to /login.
 */
export function DeleteAccountCard() {
  const t = useT().settings.deleteAccount;
  const { data: me } = useMe();
  const status = usePasswordStatus();
  const [open, setOpen] = useState(false);
  if (!me || !status.data) return null;

  return (
    <section aria-labelledby="delete-account-heading">
      <h2 id="delete-account-heading" className="mb-1 font-semibold text-error">{t.heading}</h2>
      <p className="text-sm text-text-secondary">{t.intro}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-secondary">
        {t.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="mt-3 text-sm font-semibold">{t.irreversible}</p>
      <button type="button" className="btn-secondary mt-4 border-error/60 text-error" onClick={() => setOpen(true)}>{t.open}</button>
      {open && <DeleteDialog username={me.username} hasPassword={status.data.hasPassword} onClose={() => setOpen(false)} />}
    </section>
  );
}

function DeleteDialog({ username, hasPassword, onClose }: { username: string; hasPassword: boolean; onClose: () => void }) {
  const t = useT().settings.deleteAccount;
  const qc = useQueryClient();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const fieldName = hasPassword ? "password" : "confirmation";
  const label = hasPassword ? t.passwordLabel : t.confirmationLabel(username);

  function validate(): string | null {
    if (!value.trim()) return hasPassword ? t.passwordRequired : t.confirmationRequired;
    if (!hasPassword && value.trim().toLowerCase() !== username.toLowerCase()) return t.confirmationMismatch;
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const problem = validate();
    setFieldError(problem);
    if (problem) return;
    setBusy(true);
    try {
      await deleteAccount(hasPassword ? value : null, hasPassword ? null : value);
      qc.clear();
      router.replace(ACCOUNT_DELETED_HREF); // stay "busy": the dialog disappears with the page
    } catch (err) {
      setBusy(false);
      if (isApiError(err, 429)) return setFormError(t.tooManyAttempts);
      if (isApiError(err, 409)) return setFormError(err.detail ?? t.lastAdmin);
      const messages = isApiError(err, 400) ? err.errors : undefined;
      const own = messages && Object.entries(messages).find(([key]) => key.toLowerCase() === fieldName)?.[1][0];
      if (own) setFieldError(own);
      else setFormError(t.failed);
    }
  }

  // The confirm button is disabled while the request runs, which drops the keyboard focus to the page: after a refusal
  // (or a validation message) put it back on the field, where the error is described.
  useEffect(() => {
    if (fieldError || formError) input.current?.focus();
  }, [fieldError, formError]);

  const errorId = "delete-account-error";
  return (
    <AlertDialog title={t.dialogTitle} description={t.dialogText} dismissible={!busy} onClose={onClose}>
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <div>
          <label htmlFor="delete-account-secret" className="label">{label}</label>
          <input
            ref={input}
            id="delete-account-secret"
            name={fieldName}
            type={hasPassword ? "password" : "text"}
            className="input"
            autoComplete={hasPassword ? "current-password" : "off"}
            autoCapitalize="none"
            spellCheck={false}
            value={value}
            onChange={(e) => { setValue(e.target.value); setFieldError(null); }}
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? errorId : undefined}
          />
          {fieldError && <p id={errorId} className="mt-1.5 text-sm text-error">{fieldError}</p>}
        </div>
        {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>{t.cancel}</button>
          <button type="submit" className="btn-primary !border-error !bg-error !text-white" disabled={busy}>{busy ? t.deleting : t.confirm}</button>
        </div>
      </form>
    </AlertDialog>
  );
}
