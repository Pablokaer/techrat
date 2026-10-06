"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, BarChart3, BookOpen, BrainCircuit, Code2, Map as MapIcon, Server, Trophy } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/i18n";
import { useMe } from "@/lib/queries";

const PILLARS = [
  { key: "practice", icon: Code2 },
  { key: "learn", icon: BookOpen },
  { key: "levelUp", icon: Trophy },
  { key: "grow", icon: BarChart3 },
] as const;

const HIGHLIGHTS = [
  { key: "questions", icon: Server },
  { key: "roadmaps", icon: MapIcon },
  { key: "progress", icon: Trophy },
  { key: "adaptive", icon: BrainCircuit },
] as const;

export default function Landing() {
  const { data: me } = useMe();
  const router = useRouter();
  const t = useT();
  useEffect(() => { if (me) router.replace("/dashboard"); }, [me, router]);

  return (
    <div className="matrix-bg min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2">
          <Image src="/brand/rat-192.png" alt="" width={40} height={40} />
          <span className="text-xl font-extrabold">Tech<span className="text-primary">Rat</span></span>
        </span>
        <nav className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <Link href="/login" className="btn-ghost">{t.landing.signIn}</Link>
          <Link href="/register" className="btn-primary">{t.landing.getStarted}</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="eyebrow">{t.landing.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              {t.landing.heroLine1}<br /><span className="text-primary">{t.landing.heroLine2}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-text-secondary">{t.landing.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-6 py-3 text-base">{t.landing.startFree} <ArrowRight className="h-5 w-5" aria-hidden /></Link>
              <Link href="/login" className="btn-secondary px-6 py-3 text-base">{t.landing.haveAccount}</Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image src="/brand/logo-full.png" alt={t.landing.logoAlt} width={460} height={410} priority className="h-auto w-full max-w-md drop-shadow-[0_0_60px_rgba(0,255,65,0.25)]" />
          </div>
        </section>
        <ul className="grid grid-cols-2 gap-6 border-y border-border-subtle py-10 md:grid-cols-4">
          {PILLARS.map(({ key, icon: Icon }) => (
            <li key={key} className="text-center">
              <Icon className="mx-auto h-8 w-8 text-primary" aria-hidden />
              <p className="mt-3 font-mono text-sm font-bold uppercase tracking-widest text-primary">{t.landing.pillars[key].title}</p>
              <p className="mt-1 text-sm text-text-secondary">{t.landing.pillars[key].text}</p>
            </li>
          ))}
        </ul>
        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map(({ key, icon: Icon }) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-6">
              <Icon className="h-7 w-7 text-primary" aria-hidden />
              <h2 className="mt-4 font-semibold">{t.landing.highlights[key].title}</h2>
              <p className="mt-1 text-sm text-text-secondary">{t.landing.highlights[key].text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
