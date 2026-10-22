"use client";

import Link from "next/link";
import { useT } from "@/i18n";

/**
 * The 404 page for URLs that match no route (app/global-not-found.tsx). A client component so the desktop export, which
 * renders it once at build time, still shows it in the language the app detects on the device.
 */
export function NotFound() {
  const t = useT().common.notFound;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="font-mono text-5xl font-extrabold text-primary">404</p>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="text-text-secondary">{t.body}</p>
      <Link href="/" className="btn-primary">{t.home}</Link>
    </main>
  );
}
