"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Card } from "@techrat/ui";
import { DeleteAccountCard } from "@/components/delete-account";
import { PublicFrame } from "@/components/public-frame";
import { useFormat, useLocale, useT } from "@/i18n";
import type { LegalDocument } from "@/i18n/messages/en/legal";
import { LEGAL } from "@/lib/legal";
import { publicPages, type PublicPage } from "@/lib/public-pages";
import { useMe } from "@/lib/queries";

/**
 * Highlights {{…}} spans (the TODO markers for the owner and the lawyer) and drops the braces. Exported for its own test:
 * no text uses a marker today, so the pages alone would not notice if it broke.
 */
export function RichText({ text }: { text: string }) {
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
      <div hidden dangerouslySetInnerHTML={{ __html: "<!-- DRAFT: pending legal review. Set LEGAL.draft to false (src/lib/legal.ts) only after a lawyer has reviewed this page. -->" }} />
      <aside role="note" className="mt-6 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
        <p className="font-semibold text-warning">{t.title}</p>
        <p className="mt-1 text-text-secondary">{t.text}</p>
      </aside>
    </>
  );
}

/**
 * The public frame (ADR-0042) around a legal page (privacy, terms, account deletion): each has one URL shown in the
 * visitor's language, so the frame offers the language switcher. `page` is the page's entry in `publicPages`.
 */
function LegalPage({ page, title, showUpdated = false, children }: { page: PublicPage; title: string; showUpdated?: boolean; children: ReactNode }) {
  const t = useT().legal;
  const f = useFormat();
  const { locale } = useLocale();
  return (
    <PublicFrame page={page} locale={locale} labels={{ home: t.page.home, signIn: t.page.signIn }}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {showUpdated && <p className="mt-2 text-sm text-text-muted">{t.page.updated(f.date(`${LEGAL.effectiveDate}T00:00:00`, { dateStyle: "long" }))}</p>}
      <DraftNotice />
      <div className="mt-8 space-y-8">{children}</div>
    </PublicFrame>
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

function Document({ page, title, doc }: { page: PublicPage; title: string; doc: LegalDocument }) {
  return (
    <LegalPage page={page} title={title} showUpdated>
      <div className="space-y-3 text-sm leading-relaxed text-text-secondary"><Paragraphs items={doc.intro} /></div>
      {doc.sections.map((section) => (
        <Section key={section.heading} heading={section.heading}>
          <Paragraphs items={section.paragraphs} />
          <Bullets items={section.items} />
          <Paragraphs items={section.closing} />
        </Section>
      ))}
    </LegalPage>
  );
}

/** /privacy */
export function PrivacyContent() {
  const t = useT().legal;
  return <Document page={publicPages.privacy} title={t.meta.privacy.title} doc={t.privacyPage(LEGAL)} />;
}

/** /terms */
export function TermsContent() {
  const t = useT().legal;
  return <Document page={publicPages.terms} title={t.meta.terms.title} doc={t.termsPage(LEGAL)} />;
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
    <LegalPage page={publicPages.accountDelete} title={t.title}>
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
    </LegalPage>
  );
}
