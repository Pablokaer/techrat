import type { Metadata, Viewport } from "next";
import { NotFound } from "@/components/not-found";
import { messages } from "@/i18n/messages";
import { pageLocale } from "@/i18n/server";
import { RootDocument, rootMetadata, rootViewport } from "./root-document";

/**
 * 404 for URLs that match no route. The app has one root layout per owner of the page language (ADR-0040) and none
 * above them all, so Next.js renders this file without a layout (`experimental.globalNotFound` in next.config.ts); it
 * uses the same document as the rest of the site, in the visitor's language.
 */
export async function generateMetadata(): Promise<Metadata> {
  const page = await pageLocale();
  // The site metadata (metadataBase for the preview images) with the page's own title; Next.js adds `noindex` to a 404.
  return { ...rootMetadata(page), title: { absolute: `${messages[page.locale].common.notFound.title} · TechRat` } };
}

export const viewport: Viewport = rootViewport;

export default async function GlobalNotFound() {
  return (
    <RootDocument page={await pageLocale()}>
      <NotFound />
    </RootDocument>
  );
}
