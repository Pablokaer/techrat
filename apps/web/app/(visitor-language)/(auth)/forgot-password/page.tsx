"use client";

import { useState } from "react";
import { fieldErrors, forgotPasswordSchema } from "@techrat/validation";
import { AuthFooterLink, AuthLayout, Field } from "@/components/auth-ui";
import { api } from "@/lib/api";
import { useT, useValidationTranslator } from "@/i18n";

export default function ForgotPasswordPage() {
  const t = useT();
  const translate = useValidationTranslator();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setError(fieldErrors(parsed.error, translate).email);
    await api.POST("/api/v1/auth/forgot-password", { body: parsed.data });
    setSent(true);
  }

  return (
    <AuthLayout title={t.auth.forgotPassword.title} subtitle={t.auth.forgotPassword.subtitle}>
      {sent ? (
        <p role="status" className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          {t.auth.forgotPassword.sent}
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <Field id="email" label={t.auth.fields.email} type="email" autoComplete="email" error={error} />
          <button type="submit" className="btn-primary w-full">{t.auth.forgotPassword.submit}</button>
        </form>
      )}
      <AuthFooterLink text={t.auth.forgotPassword.remembered} href="/login" cta={t.auth.forgotPassword.backToSignIn} />
    </AuthLayout>
  );
}
