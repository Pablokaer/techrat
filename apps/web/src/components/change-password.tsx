"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { isApiError } from "@techrat/api";
import { changePasswordSchema, fieldErrors } from "@techrat/validation";
import { changePassword } from "@/lib/api";
import { qk, usePasswordStatus } from "@/lib/queries";
import { useT, useValidationTranslator } from "@/i18n";

type Form = { current: string; password: string; confirm: string };
const EMPTY: Form = { current: "", password: "", confirm: "" };
/** API field names → form fields. */
const SERVER_FIELDS: Record<string, keyof Form> = { currentPassword: "current", newPassword: "password" };

/**
 * Settings → change the password (or set one, for accounts created through an external provider). Validates inline
 * with the sign-up rules; the API re-checks the current password, signs other sessions out and keeps this one.
 */
export function ChangePasswordCard() {
  const t = useT().settings.password;
  const translate = useValidationTranslator();
  const qc = useQueryClient();
  const status = usePasswordStatus();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!status.data) return null;
  const hasPassword = status.data.hasPassword;
  const schema = changePasswordSchema(hasPassword);

  function validate(next: Form) {
    const parsed = schema.safeParse(next);
    setErrors(parsed.success ? {} : fieldErrors(parsed.error, translate));
    return parsed.success;
  }

  function update(field: keyof Form, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    setDone(false);
    if (submitted) validate(next);   // inline feedback once the user tried to submit
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (!validate(form)) return;
    setSaving(true);
    try {
      await changePassword(hasPassword ? form.current : null, form.password);
      setForm(EMPTY);
      setSubmitted(false);
      setDone(true);
      if (!hasPassword) void qc.invalidateQueries({ queryKey: qk.passwordStatus });
    } catch (err) {
      if (isApiError(err, 429)) setFormError(t.tooManyAttempts);
      else if (isApiError(err) && err.errors) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [SERVER_FIELDS[k] ?? k, v[0]])));
      } else setFormError(t.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="password-heading">
      <h2 id="password-heading" className="mb-1 font-semibold">{hasPassword ? t.changeHeading : t.setHeading}</h2>
      {!hasPassword && <p className="mb-4 text-sm text-text-secondary">{t.setHelper}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        {hasPassword && (
          <PasswordField id="currentPassword" label={t.current} autoComplete="current-password" value={form.current}
            onChange={(v) => update("current", v)} error={errors.current} />
        )}
        <PasswordField id="newPassword" label={t.new} autoComplete="new-password" value={form.password}
          onChange={(v) => update("password", v)} error={errors.password} hint={t.rules} />
        <PasswordField id="confirmPassword" label={t.confirm} autoComplete="new-password" value={form.confirm}
          onChange={(v) => update("confirm", v)} error={errors.confirm} />
        {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
        {/* The inline status is the only announcement (a toast too would be read twice by screen readers). */}
        {done && <p role="status" className="text-sm text-primary">{t.changed}</p>}
        <button className="btn-primary" disabled={saving}>{saving ? t.saving : hasPassword ? t.change : t.set}</button>
      </form>
    </section>
  );
}

function PasswordField({ id, label, value, onChange, error, hint, autoComplete }: {
  id: string; label: string; value: string; onChange: (value: string) => void; error?: string; hint?: string; autoComplete: string;
}) {
  const t = useT().settings.password;
  const [visible, setVisible] = useState(false);
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} name={id} type={visible ? "text" : "password"} className="input pr-11" autoComplete={autoComplete} value={value}
          onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy} />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? t.hide : t.show} aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted hover:text-text">
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}
