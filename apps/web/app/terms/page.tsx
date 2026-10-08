import type { Metadata } from "next";
import { requestLocale } from "@/i18n/server";
import { pageMetadata } from "@/lib/page-metadata";
import { TermsContent } from "@/components/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await requestLocale(), "terms");
}

export default function TermsPage() {
  return <TermsContent />;
}
