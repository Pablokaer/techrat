"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Card } from "@techrat/ui";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LegalLinks } from "@/components/legal-links";
import { DeleteAccountCard } from "@/components/delete-account";
import { useFormat, useT } from "@/i18n";
import type { LegalDocument } from "@/i18n/messages/en/legal";
import { LEGAL } from "@/lib/legal";
import { useMe } from "@/lib/queries";

/** Highlights {{…}} spans (the TODO markers for the owner and the lawyer) and drops the braces. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\{\{(.+?)\}\}/g).map((part, i) =>
        i % 2 === 1 ? <mark key={i} className="rounded bg-warning/20 px-1 font-semibold text-warning">{part}</mark> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

/** The warning shown while LEGAL.draft is true, plus a hidden HTML comment for anyone reading the page source. */
function DraftNotice() {
  const t = useT().legal.draft;
  if (!LEGAL.draft) return null;
  return (
    <>
      <div hidden dangerouslySetInnerHTML={{ __html: "<!-- DRAFT: pending legal review. Resolve every TODO(legal) / TODO(owner) and set LEGAL.draft to false (src/lib/legal.ts) before publishing. -->" }} />
      <aside role="note" className="mt-6 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
        <p className="font-semibold text-warning">{t.title}</p>
        <p className="mt-1 text-text-secondary">{t.text}</p>
      </aside>
    </>
  );
}

/**
 * Chrome shared by the public pages (privacy, terms, account deletion): language switcher and sign-in link on top,
 * legal links at the bottom, readable for signed-out visitors and without the app shell.
 */
function PublicPage({ title, showUpdated = false, children }: { title: string; showUpdated?: boolean; children: ReactNode }) {
  const t = useT().legal;
  const f = useFormat();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-5">
        <Link href="/" className="flex items-center gap-2" aria-label={t.page.home}>
          <Image src="/brand/rat-192.png" alt="" width={36} height={36} />
          <span className="text-xl font-extrabold">Tech<span className="text-primary">Rat</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <Link href="/login" className="btn-ghost">{t.page.signIn}</Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 pb-16">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {showUpdated && <p className="mt-2 text-sm text-text-muted">{t.page.updated(f.date(`${LEGAL.effectiveDate}T00:00:00`, { dateStyle: "long" }))}</p>}
        <DraftNotice />
        <div className="mt-8 space-y-8">{children}</div>
      </main>
      <footer className="mx-auto max-w-3xl border-t border-border-subtle px-5 py-6">
        <LegalLinks withDelete />
      </footer>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{heading}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

function Paragraphs({ items }: { items?: string[] }) {
  return <>{items?.map((text) => <p key={text}><RichText text={text} /></p>)}</>;
}

function Bullets({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return <ul className="list-disc space-y-1.5 pl-5">{items.map((text) => <li key={text}><RichText text={text} /></li>)}</ul>;
}

function Document({ title, doc }: { title: string; doc: LegalDocument }) {
  return (
    <PublicPage title={title} showUpdated>
      <div className="space-y-3 text-sm leading-relaxed text-text-secondary"><Paragraphs items={doc.intro} /></div>
      {doc.sections.map((section) => (
        <Section key={section.heading} heading={section.heading}>
          <Paragraphs items={section.paragraphs} />
          <Bullets items={section.items} />
          <Paragraphs items={section.closing} />
        </Section>
      ))}
    </PublicPage>
  );
}

/** /privacy */
export function PrivacyContent() {
  const t = useT().legal;
  return <Document title={t.meta.privacy.title} doc={t.privacyPage(LEGAL)} />;
}

/** /terms */
export function TermsContent() {
  const t = useT().legal;
  return <Document title={t.meta.terms.title} doc={t.termsPage(LEGAL)} />;
}

/**
 * /account/delete: the public URL for Google Play's "delete your account" requirement. It explains the deletion for
 * anyone, offers the same deletion card as Settings when the visitor is signed in, and otherwise sends them to sign in
 * (and back here) or to the contact email when they can no longer sign in.
 */
export function AccountDeleteContent() {
  const t = useT().legal.accountDelete;
  const items = useT().settings.deleteAccount.items;
  const { data: me, isLoading } = useMe();
  return (
    <PublicPage title={t.title}>
      <p className="text-text-secondary">{t.lead}</p>
      {isLoading ? (
        <p role="status" className="text-sm text-text-muted">{t.checking}</p>
      ) : me ? (
        <Card className="border-error/40 p-6"><DeleteAccountCard /></Card>
      ) : (
        <Card className="p-6">
          <h2 className="font-semibold">{t.signedOutHeading}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t.signedOutText}</p>
          <Link href="/login?next=/account/delete" className="btn-primary mt-4">{t.signInToDelete}</Link>
          <p className="mt-4 text-sm text-text-secondary">{t.cannotSignIn(LEGAL.contactEmail)}</p>
        </Card>
      )}
      <Section heading={t.howHeading}>
        <ol className="list-decimal space-y-1.5 pl-5">{t.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>{t.inApp}</p>
      </Section>
      <Section heading={t.deletedHeading}>
        <p>{t.deletedIntro}</p>
        <Bullets items={items} />
      </Section>
      <Section heading={t.keptHeading}><Bullets items={t.kept} /></Section>
      <Section heading={t.timingHeading}><Paragraphs items={t.timing} /></Section>
    </PublicPage>
  );
}
