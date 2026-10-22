import type { Metadata, Viewport } from "next";
import { pageLocale } from "@/i18n/server";
import { RootDocument, rootMetadata, rootViewport } from "../root-document";

/**
 * Root layout of every page whose URL does not fix a language (the landing page at `/`, the app, sign-in, the legal
 * pages): they are shown in the visitor's language, saved choice first, then the browser (ADR-0040).
 */
export async function generateMetadata(): Promise<Metadata> {
  return rootMetadata(await pageLocale());
}

export const viewport: Viewport = rootViewport;

export default async function VisitorLanguageLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument page={await pageLocale()}>{children}</RootDocument>;
}
