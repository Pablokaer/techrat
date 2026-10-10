"use client";

import Link from "next/link";
import { useState } from "react";
import { isApiError } from "@techrat/api";
import { fieldErrors, registerSchema } from "@techrat/validation";
import { AuthFooterLink, AuthLayout, Field, FormError, OAuthButtons } from "@/components/auth-ui";
import { ResendConfirmation } from "@/components/resend-confirmation";
import { api, unwrap } from "@/lib/api";
import { useT, useValidationTranslator } from "@/i18n";

export default function RegisterPage() {
  const t = useT();
  const translate = useValidationTranslator();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // The account cannot sign in until the emailed link is followed, so there is no automatic sign-in: the page says where it went.
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error, translate));
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      const { email, password, username, displayName } = parsed.data;
      await unwrap(api.POST("/api/v1/auth/register", { body: { email, password, username, displayName: displayName || null } }));
      setSentTo(email);
    } catch (err) {
      if (isApiError(err) && err.errors) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      } else {
        setFormError(isApiError(err) ? err.detail ?? err.title : t.common.networkError);
      }
      setPending(false);
    }
  }

  if (sentTo) {
    const notice = t.auth.register.checkEmail;
    return (
      <AuthLayout title={t.auth.register.title} subtitle={t.auth.register.subtitle}>
        <div className="space-y-5">
          <h2 className="text-xl font-bold">{notice.title}</h2>
          <p className="text-sm text-text-secondary">{notice.text(sentTo)}</p>
          <ResendConfirmation email={sentTo} label={notice.resend} />
          <Link href="/login" className="btn-primary w-full">{notice.toSignIn}</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.auth.register.title} subtitle={t.auth.register.subtitle}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Field id="email" label={t.auth.fields.email} type="email" autoComplete="email" error={errors.email} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="username" label={t.auth.fields.username} autoComplete="username" placeholder={t.auth.register.usernamePlaceholder} error={errors.username} />
          <Field id="displayName" label={t.auth.fields.displayName} autoComplete="nickname" placeholder={t.auth.register.displayNamePlaceholder} error={errors.displayName} />
        </div>
        <Field id="password" label={t.auth.fields.password} type="password" autoComplete="new-password" error={errors.password} />
        <p className="-mt-3 text-xs text-text-muted">{t.auth.register.passwordHint}</p>
        <p className="-mt-2 text-xs text-text-muted">
          {t.legal.consent.before}
          <Link href="/terms" className="text-primary hover:underline">{t.legal.consent.terms}</Link>
          {t.legal.consent.and}
          <Link href="/privacy" className="text-primary hover:underline">{t.legal.consent.privacy}</Link>
          {t.legal.consent.after}
        </p>
        <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? t.auth.register.submitting : t.auth.register.submit}</button>
        <OAuthButtons />
        <AuthFooterLink text={t.auth.register.haveAccount} href="/login" cta={t.auth.register.signIn} />
      </form>
    </AuthLayout>
  );
}
