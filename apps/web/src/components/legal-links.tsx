"use client";

import Link from "next/link";
import { cx } from "@techrat/ui";
import { useT } from "@/i18n";

/**
 * Links to the privacy policy and the terms (and optionally the account-deletion page). One component for every
 * footer (landing, sign-in pages, app shell, public pages) so the labels and URLs cannot drift apart.
 */
export function LegalLinks({ withDelete = false, className }: { withDelete?: boolean; className?: string }) {
  const t = useT().legal.footer;
  const link = "text-text-secondary underline-offset-4 hover:text-primary hover:underline";
  return (
    <nav aria-label={t.label} className={cx("flex flex-wrap items-center gap-x-5 gap-y-1 text-sm", className)}>
      <Link href="/privacy" className={link}>{t.privacy}</Link>
      <Link href="/terms" className={link}>{t.terms}</Link>
      {withDelete && <Link href="/account/delete" className={link}>{t.deleteAccount}</Link>}
    </nav>
  );
}
