import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { LegalLinks } from "@/components/legal-links";
import { JsonLd } from "@/components/structured-data";
import { I18nProvider } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import {
  catalogMetadata, catalogPath, fetchRoadmap, fetchRoadmaps, fetchTopic, fetchTopics, type CatalogKind,
} from "@/lib/public-catalog";
import { LANDING_PATHS, siteUrl } from "@/lib/site-metadata";

/*
 * Public catalog pages (ADR-0036): server components that render the roadmaps and topics as plain HTML for visitors
 * without an account and for search engines. Texts come straight from `messages[locale]`, the data from the API in the
 * same language; only the footer is a client component, so it gets an I18nProvider fixed to the page's language.
 */

const OTHER: Record<Locale, Locale> = { en: "pt-BR", "pt-BR": "en" };
const card = "rounded-2xl border border-border bg-card p-5";

/** `total` is optional in the API contract; the four difficulties always add up to it. */
const totalQuestions = (q: { easy: number; medium: number; hard: number; expert: number; total?: number }) =>
  q.total ?? q.easy + q.medium + q.hard + q.expert;

interface Crumb { name: string; path: string }

/** schema.org BreadcrumbList for the trail shown at the top of the page. */
const breadcrumbData = (crumbs: Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${siteUrl()}${c.path}` })),
});

function CatalogShell({ locale, kind, slug, crumbs, children }: {
  locale: Locale; kind?: CatalogKind; slug?: string; crumbs: Crumb[]; children: ReactNode;
}) {
  const t = messages[locale].catalog.nav;
  const other = OTHER[locale];
  return (
    <I18nProvider initialLocale={locale}>
      <div className="min-h-dvh">
        <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
          <Link href={LANDING_PATHS[locale]} className="flex items-center gap-2" aria-label={t.home}>
            <Image src="/brand/rat-192.png" alt="" width={36} height={36} />
            <span className="text-xl font-extrabold">Tech<span className="text-primary">Rat</span></span>
          </Link>
          <nav aria-label={t.label} className="flex items-center gap-2">
            <Link href={catalogPath(other, kind, slug)} hrefLang={other} className="btn-ghost">{t.otherLanguage}</Link>
            <Link href="/login" className="btn-ghost">{t.signIn}</Link>
            <Link href="/register" className="btn-primary hidden sm:inline-flex">{t.startFree}</Link>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-5 pb-16">
          <nav aria-label={t.breadcrumb}>
            <ol className="flex flex-wrap gap-2 text-sm text-text-muted">
              {crumbs.map((c, i) => (
                <li key={c.path} className="flex gap-2">
                  {i > 0 && <span aria-hidden>›</span>}
                  {i < crumbs.length - 1 ? <Link href={c.path} className="hover:text-primary">{c.name}</Link> : <span aria-current="page">{c.name}</span>}
                </li>
              ))}
            </ol>
          </nav>
          <JsonLd data={breadcrumbData(crumbs)} />
          {children}
        </main>
        <footer className="mx-auto max-w-5xl border-t border-border-subtle px-5 py-6">
          <LegalLinks withDelete />
        </footer>
      </div>
    </I18nProvider>
  );
}

function CallToAction({ label, text }: { label: string; text: string }) {
  return (
    <section className={`${card} mt-10 text-center`}>
      <p className="text-text-secondary">{text}</p>
      <Link href="/register" className="btn-primary mt-4 px-6 py-3 text-base">{label}</Link>
    </section>
  );
}

const homeCrumbs = (locale: Locale): Crumb[] => [
  { name: "TechRat", path: LANDING_PATHS[locale] },
  { name: messages[locale].catalog.nav.catalog, path: catalogPath(locale) },
];

/* ---------- /catalog ---------- */

export function catalogIndexMetadata(locale: Locale): Metadata {
  const t = messages[locale].catalog.index;
  return catalogMetadata(locale, t.title, t.description);
}

export async function CatalogIndexPage({ locale }: { locale: Locale }) {
  const t = messages[locale].catalog.index;
  const [roadmaps, topics] = await Promise.all([fetchRoadmaps(locale), fetchTopics(locale)]);
  return (
    <CatalogShell locale={locale} crumbs={homeCrumbs(locale)}>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{t.heading}</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">{t.intro}</p>
      <section aria-labelledby="catalog-roadmaps" className="mt-10">
        <h2 id="catalog-roadmaps" className="text-xl font-semibold">{t.roadmaps}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {roadmaps.map((r) => (
            <li key={r.slug}>
              <Link href={catalogPath(locale, "roadmaps", r.slug)} className={`${card} block hover:border-primary/50`}>
                <span className="font-semibold">{r.name}</span>
                <span className="mt-1 block text-sm text-text-secondary">{r.description}</span>
                <span className="mt-2 block text-xs text-text-muted">{r.category} · {t.modules(r.modulesCount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="catalog-topics" className="mt-10">
        <h2 id="catalog-topics" className="text-xl font-semibold">{t.topics}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <li key={topic.slug}>
              <Link href={catalogPath(locale, "topics", topic.slug)} className={`${card} block hover:border-primary/50`}>
                <span className="font-semibold">{topic.name}</span>
                <span className="mt-1 block text-xs text-text-muted">{topic.category} · {t.questions(totalQuestions(topic.questions))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </CatalogShell>
  );
}

/* ---------- /catalog/roadmaps/<slug> ---------- */

export async function roadmapPageMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const roadmap = await fetchRoadmap(slug, locale);
  if (!roadmap) return {};
  return catalogMetadata(locale, messages[locale].catalog.roadmap.title(roadmap.summary.name), roadmap.summary.description, "roadmaps", slug);
}

export async function RoadmapPage({ locale, slug }: { locale: Locale; slug: string }) {
  const roadmap = await fetchRoadmap(slug, locale);
  if (!roadmap) notFound();
  const { summary, modules, prerequisites } = roadmap;
  const t = messages[locale].catalog.roadmap;
  const difficulty = messages[locale].common.roadmapDifficulty[summary.difficulty] ?? summary.difficulty;
  const title = t.title(summary.name);
  const course = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: summary.name,
    description: summary.description,
    url: `${siteUrl()}${catalogPath(locale, "roadmaps", slug)}`,
    inLanguage: locale,
    educationalLevel: summary.difficulty,
    timeRequired: `PT${summary.estimatedHours}H`,
    isAccessibleForFree: true,
    provider: { "@type": "Organization", name: "TechRat", url: `${siteUrl()}/` },
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: `PT${summary.estimatedHours}H` },
    offers: { "@type": "Offer", price: 0, priceCurrency: "EUR", category: "Free" },
  };
  return (
    <CatalogShell locale={locale} kind="roadmaps" slug={slug} crumbs={[...homeCrumbs(locale), { name: title, path: catalogPath(locale, "roadmaps", slug) }]}>
      <JsonLd data={course} />
      <p className="eyebrow mt-6">{summary.category}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-text-secondary">{summary.description}</p>
      <ul aria-label={t.facts} className="mt-6 flex flex-wrap gap-2 text-sm">
        {[difficulty, t.hours(summary.estimatedHours), t.modules(summary.modulesCount), t.steps(summary.stepsCount)].map((fact) => (
          <li key={fact} className="rounded-full border border-border px-3 py-1">{fact}</li>
        ))}
      </ul>
      {prerequisites.length > 0 && (
        <section aria-labelledby="roadmap-prerequisites" className="mt-8">
          <h2 id="roadmap-prerequisites" className="text-xl font-semibold">{t.prerequisites}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {prerequisites.map((p) => (
              <li key={p.slug}><Link href={catalogPath(locale, "roadmaps", p.slug)} className="text-primary hover:underline">{p.name}</Link></li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="roadmap-content" className="mt-10">
        <h2 id="roadmap-content" className="text-xl font-semibold">{t.content}</h2>
        <ol className="mt-4 space-y-4">
          {modules.map((m) => (
            <li key={m.id} className={card}>
              <h3 className="font-semibold">
                <span className="text-text-muted">{m.order}.</span> {m.title}
                {!m.isRequired && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal">{t.optional}</span>}
              </h3>
              {m.description && <p className="mt-1 text-sm text-text-secondary">{m.description}</p>}
              <ul className="mt-3 space-y-2 text-sm">
                {m.steps.map((s) => (
                  <li key={s.id}>
                    <span className="font-medium">{s.title}</span>
                    {" — "}
                    <Link href={catalogPath(locale, "topics", s.topicSlug)} className="text-primary hover:underline">{s.topicName} · {s.subtopicName}</Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
      <CallToAction label={t.cta} text={t.ctaText} />
    </CatalogShell>
  );
}

/* ---------- /catalog/topics/<slug> ---------- */

export async function topicPageMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const detail = await fetchTopic(slug, locale);
  if (!detail) return {};
  const { topic } = detail;
  const t = messages[locale].catalog.topic;
  return catalogMetadata(locale, t.title(topic.name), t.description(totalQuestions(topic.questions), topic.name, topic.description), "topics", slug);
}

export async function TopicPage({ locale, slug }: { locale: Locale; slug: string }) {
  const detail = await fetchTopic(slug, locale);
  if (!detail) notFound();
  const { topic } = detail;
  const t = messages[locale].catalog.topic;
  const levels = messages[locale].common.difficulty;
  const title = t.title(topic.name);
  const counts = [["Easy", topic.questions.easy], ["Medium", topic.questions.medium], ["Hard", topic.questions.hard], ["Expert", topic.questions.expert]] as const;
  return (
    <CatalogShell locale={locale} kind="topics" slug={slug} crumbs={[...homeCrumbs(locale), { name: title, path: catalogPath(locale, "topics", slug) }]}>
      <p className="eyebrow mt-6">{topic.category}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-text-secondary">{topic.description}</p>
      <p className="mt-4 font-semibold text-primary">{t.questions(totalQuestions(topic.questions))}</p>
      <section aria-labelledby="topic-difficulty" className="mt-8">
        <h2 id="topic-difficulty" className="text-xl font-semibold">{t.byDifficulty}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counts.map(([level, n]) => (
            <div key={level} className={card}><dt className="text-sm text-text-muted">{levels[level] ?? level}</dt><dd className="text-2xl font-bold">{n}</dd></div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="topic-subtopics" className="mt-10">
        <h2 id="topic-subtopics" className="text-xl font-semibold">{t.subtopics}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {topic.subtopics.map((s) => (
            <li key={s.slug} className={`${card} flex items-center justify-between gap-3 py-3`}>
              <span>{s.name}</span><span className="text-sm text-text-muted">{t.questions(s.questionCount)}</span>
            </li>
          ))}
        </ul>
      </section>
      <CallToAction label={t.cta} text={t.ctaText} />
    </CatalogShell>
  );
}
