"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { fieldErrors, resetPasswordSchema } from "@techrat/validation";
import { AuthLayout, Field, FormError } from "@/components/auth-ui";
import { api } from "@/lib/api";
import { useT, useValidationTranslator } from "@/i18n";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const t = useT();
  const translate = useValidationTranslator();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error, translate));
    const { response } = await api.POST("/api/v1/auth/reset-password", {
      body: { email: params.get("email") ?? "", resetCode: params.get("code") ?? "", newPassword: parsed.data.password },
    });
    if (response.ok) router.replace("/login?reset=1");
    else setFormError(t.auth.resetPassword.invalidLink);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Field id="password" label={t.auth.fields.newPassword} type="password" autoComplete="new-password" error={errors.password} />
      <Field id="confirm" label={t.auth.fields.confirmPassword} type="password" autoComplete="new-password" error={errors.confirm} />
      <button type="submit" className="btn-primary w-full">{t.auth.resetPassword.submit}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
  return (
    <AuthLayout title={t.auth.resetPassword.title} subtitle={t.auth.resetPassword.subtitle}>
      <Suspense><ResetForm /></Suspense>
    </AuthLayout>
  );
}
