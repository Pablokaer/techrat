import type { Metadata, Viewport } from "next";
import { pageLocale } from "@/i18n/server";
import { RootDocument, rootMetadata, rootViewport } from "../root-document";

/**
 * Root layout of the Portuguese URLs (/pt-BR, /pt-BR/catalog/…): always Portuguese, whatever the visitor saved, so
 * search engines index them as Portuguese (`<html lang="pt-BR">` in the server HTML). Being its own root layout, moving
 * between this tree and the rest of the site is a full page load (ADR-0040).
 */
export async function generateMetadata(): Promise<Metadata> {
  return rootMetadata(await pageLocale("pt-BR"));
}

export const viewport: Viewport = rootViewport;

export default async function PortugueseLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument page={await pageLocale("pt-BR")}>{children}</RootDocument>;
}
