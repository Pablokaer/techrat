"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, Bell, BookOpen, ChevronDown, Code2, Flame, Home, LogOut, Map as MapIcon, Search, Settings, Shield, Trophy, User, Users,
} from "lucide-react";
import { cx } from "@techrat/ui";
import type { UserSummary } from "@techrat/types";
import { useFormat, useT } from "@/i18n";
import { api, logout, unwrap } from "@/lib/api";
import { qk, useMe, useNotifications, useSearch } from "@/lib/queries";
import { searchHref } from "@/lib/routes";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TopicIcon } from "./icons";

const NAV = [
  { href: "/dashboard", key: "dashboard", icon: Home },
  { href: "/learn", key: "learn", icon: BookOpen },
  { href: "/practice", key: "practice", icon: Code2 },
  { href: "/roadmaps", key: "roadmaps", icon: MapIcon },
  { href: "/analytics", key: "analytics", icon: BarChart3 },
  { href: "/leaderboard", key: "leaderboard", icon: Trophy },
  { href: "/community", key: "community", icon: Users },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

const MOBILE_NAV = [
  { href: "/dashboard", key: "home", icon: Home },
  { href: "/learn", key: "learn", icon: BookOpen },
  { href: "/practice", key: "practice", icon: Code2 },
  { href: "/roadmaps", key: "roadmaps", icon: MapIcon },
  { href: "/profile", key: "profile", icon: User },
] as const;

export function Logo({ compact = false }: { compact?: boolean }) {
  const t = useT();
  return (
    <Link href="/dashboard" className="flex items-center gap-2" aria-label={t.shell.home}>
      <Image src="/brand/rat-192.png" alt="" width={40} height={40} priority className="h-9 w-9" />
      {!compact && (
        <span className="text-xl font-extrabold tracking-tight">
          Tech<span className="text-primary">Rat</span>
        </span>
      )}
    </Link>
  );
}

export function Avatar({ user, size = 36 }: { user: Pick<UserSummary, "displayName" | "avatarUrl">; size?: number }) {
  const initials = user.displayName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatarUrl} alt="" width={size} height={size} className="rounded-full border border-primary/50 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary/50 bg-primary/10 font-mono text-xs font-bold text-primary"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`) ||
    (href === "/learn" && pathname.startsWith("/topic")) || (href === "/roadmaps" && (pathname.startsWith("/roadmap") || pathname.startsWith("/module")));
}

function Sidebar({ me }: { me: UserSummary }) {
  const pathname = usePathname();
  const t = useT();
  const items = me.isAdmin ? [...NAV, { href: "/admin", key: "admin", icon: Shield } as const] : NAV;
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border-subtle bg-bg-2/60 px-4 py-6 lg:flex">
      <div className="px-2"><Logo /></div>
      <nav aria-label={t.shell.mainNav} className="mt-8 flex flex-1 flex-col gap-1">
        {items.map(({ href, key, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                active ? "glow-border border bg-primary/10 text-text" : "border border-transparent text-text-secondary hover:bg-white/5 hover:text-text",
              )}
            >
              <Icon className={cx("h-5 w-5", active ? "text-primary" : "")} aria-hidden />
              {t.shell.nav[key]}
            </Link>
          );
        })}
      </nav>
      <div className="matrix-bg rounded-2xl border border-border-subtle p-4 font-mono text-[11px] leading-5 tracking-[0.25em] text-primary">
        <p>&lt;/&gt;</p>
        {t.shell.motto.map((word, i) => <p key={i}>{word}</p>)}
      </div>
    </aside>
  );
}

function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const { data } = useSearch(q);
  const t = useT();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = q.trim().length >= 2 ? data ?? [] : [];
  return (
    <div className="relative w-full max-w-xl">
      <label htmlFor="global-search" className="sr-only">{t.shell.search.label}</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
      <input
        id="global-search"
        ref={ref}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === "Enter" && results[0]) { router.push(searchHref(results[0])); setOpen(false); } }}
        placeholder={t.shell.search.placeholder}
        className="input h-11 pl-10 pr-14"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        autoComplete="off"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:block">⌘K</kbd>
      {open && results.length > 0 && (
        <ul id="search-results" role="listbox" className="absolute z-40 mt-2 max-h-96 w-full overflow-auto rounded-2xl border border-border bg-card-raised p-2 shadow-2xl">
          {results.map((r) => (
            <li key={`${r.type}-${r.url}`} role="option" aria-selected={false}>
              <Link href={searchHref(r)} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><TopicIcon name={r.icon} className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-text-muted">{t.shell.search.type[r.type] ?? r.type} · {r.subtitle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationsMenu() {
  const { data } = useNotifications();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const t = useT();
  const unread = data?.unreadCount ?? 0;
  const markAll = async () => {
    await api.POST("/api/v1/notifications/read");
    qc.invalidateQueries({ queryKey: qk.notifications });
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-white/5 hover:text-text"
        aria-label={t.shell.notifications.label(unread)}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-bg" />}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-border bg-card-raised p-2 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold">{t.shell.notifications.title}</p>
            {unread > 0 && <button onClick={markAll} className="text-xs text-primary hover:underline">{t.shell.notifications.markAllRead}</button>}
          </div>
          <ul className="max-h-80 overflow-auto">
            {(data?.items ?? []).length === 0 && <li className="px-3 py-6 text-center text-sm text-text-muted">{t.shell.notifications.empty}</li>}
            {data?.items.map((n) => (
              <li key={n.id} className={cx("rounded-xl px-3 py-2", !n.isRead && "bg-primary/5")}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-text-secondary">{n.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UserMenu({ me }: { me: UserSummary }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();
  const signOut = async () => {
    await logout();
    qc.clear();
    router.replace("/login");
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5" aria-expanded={open} aria-label={t.shell.account.menu}>
        <Avatar user={me} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight">{me.displayName}</span>
          <span className="block text-xs text-text-muted">{t.common.level(me.level.level)}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-text-muted sm:block" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-52 rounded-2xl border border-border bg-card-raised p-1.5 shadow-2xl" onMouseLeave={() => setOpen(false)}>
          <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5" onClick={() => setOpen(false)}><User className="h-4 w-4" /> {t.shell.account.profile}</Link>
          <Link href="/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5" onClick={() => setOpen(false)}><Settings className="h-4 w-4" /> {t.shell.account.settings}</Link>
          {me.isAdmin && <Link href="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5" onClick={() => setOpen(false)}><Shield className="h-4 w-4" /> {t.shell.account.admin}</Link>}
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-error hover:bg-error/10"><LogOut className="h-4 w-4" /> {t.shell.account.signOut}</button>
        </div>
      )}
    </div>
  );
}

function Topbar({ me }: { me: UserSummary }) {
  const t = useT();
  const f = useFormat();
  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <div className="lg:hidden"><Logo compact /></div>
        <SearchBox />
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Link href="/profile" className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 hover:bg-white/5" title={t.shell.streak.title}>
            <Flame className="h-5 w-5 text-warning" aria-hidden />
            <span className="font-mono text-sm font-bold">{me.currentStreak}</span>
            <span className="sr-only">{t.shell.streak.srLabel}</span>
          </Link>
          <Link href="/profile" className="hidden items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 md:flex" title={t.shell.totalXp}>
            <span className="font-mono text-sm font-bold text-primary">{t.common.xp(f.number(me.level.totalXp))}</span>
          </Link>
          <LanguageSwitcher compact />
          <NotificationsMenu />
          <UserMenu me={me} />
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav aria-label={t.shell.mainNav} className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE_NAV.map(({ href, key, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-primary" : "text-text-muted")}>
                <Icon className="h-5 w-5" aria-hidden />
                {t.shell.nav[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Authenticated layout: sidebar on desktop, bottom navigation on mobile. Redirects to /login when signed out. */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();

  useEffect(() => {
    if (!isLoading && me === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isLoading, me, router, pathname]);

  if (!me) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Image src="/brand/rat-192.png" alt={t.shell.loadingApp} width={64} height={64} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar me={me} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar me={me} />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 md:px-6 lg:pb-12">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

export async function refreshMe() {
  return unwrap(api.GET("/api/v1/users/me"));
}
