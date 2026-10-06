"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserSummary } from "@techrat/types";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Card } from "@techrat/ui";
import { isApiError } from "@techrat/api";
import { fieldErrors, profileSchema } from "@techrat/validation";
import { api, logout, unwrap } from "@/lib/api";
import { qk, useMe } from "@/lib/queries";
import { Field } from "@/components/auth-ui";
import { PageHeader } from "@/components/widgets";
import { useToast } from "@/components/providers";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT, useValidationTranslator } from "@/i18n";

export default function SettingsPage() {
  const { data: me } = useMe();
  if (!me) return null;
  return <SettingsForm key={me.id} me={me} />;
}

function SettingsForm({ me }: { me: UserSummary }) {
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const translate = useValidationTranslator();
  const [form, setForm] = useState({ displayName: me.displayName, bio: me.bio ?? "", avatarUrl: me.avatarUrl ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error, translate));
    setErrors({});
    setSaving(true);
    try {
      const updated = await unwrap(api.PATCH("/api/v1/users/me", { body: { displayName: form.displayName, bio: form.bio, avatarUrl: form.avatarUrl } }));
      qc.setQueryData(qk.me, updated);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast({ kind: "success", title: t.settings.profile.saved });
    } catch (err) {
      if (isApiError(err) && err.errors) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      else toast({ kind: "error", title: t.settings.profile.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow={t.settings.eyebrow} title={t.settings.title} subtitle={t.settings.signedInAs(me.email)} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <h2 className="mb-5 font-semibold">{t.settings.profile.heading}</h2>
          <form onSubmit={save} className="space-y-5" noValidate>
            <Field id="displayName" label={t.settings.profile.displayName} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} error={errors.displayName} />
            <div>
              <label htmlFor="bio" className="label">{t.settings.profile.bio}</label>
              <textarea id="bio" className="input min-h-24" maxLength={280} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} aria-describedby="bio-count" />
              <p id="bio-count" className="mt-1 text-right text-xs text-text-muted">{form.bio.length}/280</p>
            </div>
            <Field id="avatarUrl" label={t.settings.profile.avatarUrl} value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} error={errors.avatarUrl} placeholder={t.settings.profile.avatarPlaceholder} />
            <button className="btn-primary" disabled={saving}>{saving ? t.settings.profile.saving : t.settings.profile.save}</button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="font-semibold">{t.settings.language.heading}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t.settings.language.helper}</p>
            <LanguageSwitcher className="mt-4" />
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">{t.settings.connected.heading}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t.settings.connected.text}</p>
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">{t.settings.session.heading}</h2>
            <button className="btn-secondary mt-4 w-full text-error" onClick={async () => { await logout(); qc.clear(); router.replace("/login"); }}>
              <LogOut className="h-4 w-4" /> {t.settings.session.signOut}
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}
