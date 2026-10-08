"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { BarChart3, BookOpen, Code2, KeyRound, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LegalLinks } from "@/components/legal-links";
import { useT } from "@/i18n";
import type { Messages } from "@/i18n/messages";

const PILLAR_ICONS = [
  { key: "practice", icon: Code2 },
  { key: "learn", icon: BookOpen },
  { key: "levelUp", icon: Trophy },
  { key: "grow", icon: BarChart3 },
] as const;

function buildPillars(t: Messages) {
  return PILLAR_ICONS.map(({ key, icon }) => ({ key, icon, ...t.auth.layout.pillars[key] }));
}

/** The four product pillars, labelled in the active language. */
export function usePillars() {
  return buildPillars(useT());
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const t = useT();
  const pillars = usePillars();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="matrix-bg relative hidden flex-col justify-between border-r border-border-subtle p-12 lg:flex">
        <p className="font-mono text-xs leading-6 tracking-[0.3em] text-primary/80">{t.auth.layout.slogan.map((line) => <Fragment key={line}>{line}<br /></Fragment>)}&lt;/&gt;</p>
        <div className="flex flex-col items-center text-center">
          <Image src="/brand/logo-full.png" alt="TechRat" width={360} height={322} priority className="h-auto w-80" />
          <p className="mt-6 font-mono text-sm tracking-[0.45em] text-text-secondary">{t.auth.layout.motto.learn} <span className="text-primary">&gt;</span> {t.auth.layout.motto.practice} <span className="text-primary">&gt;</span> {t.auth.layout.motto.levelUp}</p>
          <p className="mt-6 max-w-md text-lg font-semibold tracking-wide">{t.auth.layout.tagline}</p>
        </div>
        <ul className="grid grid-cols-4 gap-4">
          {pillars.map(({ key, icon: Icon, title, text }) => (
            <li key={key} className="text-center">
              <Icon className="mx-auto h-7 w-7 text-primary" aria-hidden />
              <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-primary">{title}</p>
              <p className="mt-1 text-xs text-text-secondary">{text}</p>
            </li>
          ))}
        </ul>
      </aside>
      <main className="relative flex items-center justify-center px-5 pb-12 pt-20 lg:pt-16">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher compact />
        </div>
        <div className="w-full max-w-md">
          {/* Phones have no side panel: the logo opens the screen, centred above the title. */}
          <div data-testid="auth-mobile-logo" className="mb-6 flex justify-center lg:hidden">
            <Image src="/brand/logo-full.png" alt="TechRat" width={360} height={322} priority className="h-auto w-40 drop-shadow-[0_0_40px_rgba(0,255,65,0.25)]" />
          </div>
          <h1 className="text-center text-3xl font-bold tracking-tight lg:text-left">{title}</h1>
          <p className="mt-2 text-center text-text-secondary lg:text-left">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <LegalLinks className="mt-10 justify-center lg:justify-start" />
        </div>
      </main>
    </div>
  );
}

export function Field({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl border border-error/40 bg-error/10 px-3.5 py-2.5 text-sm text-error">{message}</p>;
}

/** External providers (OAuth). GitHub is featured; disabled until configured in the backend. */
export function OAuthButtons() {
  const t = useT();
  const { data } = useQuery({ queryKey: ["providers"], queryFn: () => unwrap(api.GET("/api/v1/auth/providers")), staleTime: Infinity });
  const github = data?.find((p) => p.name === "github");
  if (!github) return null;
  return (
    <div className="mt-6">
      <div className="relative my-6 text-center text-xs text-text-muted">
        <span className="relative z-10 bg-bg px-3">{t.auth.oauth.or}</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-border-subtle" />
      </div>
      <button type="button" disabled={!github.enabled} className="btn-secondary w-full" title={github.enabled ? undefined : t.auth.oauth.githubComingSoon}>
        <KeyRound className="h-4 w-4" aria-hidden /> {t.auth.oauth.continueWithGithub} {!github.enabled && <span className="text-xs text-text-muted">{t.auth.oauth.soon}</span>}
      </button>
    </div>
  );
}

export function AuthFooterLink({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <p className="mt-8 text-center text-sm text-text-secondary">
      {text} <Link href={href} className="font-semibold text-primary hover:underline">{cta}</Link>
    </p>
  );
}
