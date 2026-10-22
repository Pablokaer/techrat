import type { Metadata, Viewport } from "next";
import { pageLocale } from "@/i18n/server";
import { RootDocument, rootMetadata, rootViewport } from "../root-document";

/**
 * Root layout of the English public catalog (/catalog/…, web build only like its pages): always English, the
 * counterpart of /pt-BR/catalog, so search engines get `<html lang="en">` whatever a visitor saved (ADR-0040).
 */
export async function generateMetadata(): Promise<Metadata> {
  return rootMetadata(await pageLocale("en"));
}

export const viewport: Viewport = rootViewport;

export default async function EnglishCatalogLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument page={await pageLocale("en")}>{children}</RootDocument>;
}
