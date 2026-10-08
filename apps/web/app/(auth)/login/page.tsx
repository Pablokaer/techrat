"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@techrat/api";
import { fieldErrors, loginSchema } from "@techrat/validation";
import { AuthFooterLink, AuthLayout, Field, FormError, OAuthButtons } from "@/components/auth-ui";
import { login } from "@/lib/api";
import { useT, useValidationTranslator } from "@/i18n";
import { qk } from "@/lib/queries";
import { safeNextPath } from "@/lib/safe-redirect";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const t = useT();
  const translate = useValidationTranslator();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // "Account deleted" is announced once: remembered here, then removed from the URL so a reload or a bookmark stays quiet.
  const [deleted] = useState(() => params.get("deleted") === "1");
  useEffect(() => {
    if (!deleted) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("deleted");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [deleted]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error, translate));
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      const me = await login(parsed.data.email, parsed.data.password);
      qc.setQueryData(qk.me, me);
      router.replace(safeNextPath(params.get("next")) ?? "/dashboard");
    } catch (err) {
      setFormError(isApiError(err) ? err.detail ?? err.title : t.common.networkError);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {deleted && <p role="status" className="rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-sm text-primary">{t.auth.login.accountDeleted}</p>}
      {params.get("reset") === "1" && <p role="status" className="rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-sm text-primary">{t.auth.login.passwordUpdated}</p>}
      <FormError message={formError} />
      <Field id="email" label={t.auth.fields.email} type="email" autoComplete="email" error={errors.email} />
      <Field id="password" label={t.auth.fields.password} type="password" autoComplete="current-password" error={errors.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-text-secondary hover:text-primary">{t.auth.login.forgotPassword}</Link>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? t.auth.login.submitting : t.auth.login.submit}</button>
      <OAuthButtons />
      <AuthFooterLink text={t.auth.login.newHere} href="/register" cta={t.auth.login.createAccount} />
    </form>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <AuthLayout title={t.auth.login.title} subtitle={t.auth.login.subtitle}>
      <Suspense><LoginForm /></Suspense>
    </AuthLayout>
  );
}
