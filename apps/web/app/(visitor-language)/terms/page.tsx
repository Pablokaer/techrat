import type { Metadata } from "next";
import { pageLocale } from "@/i18n/server";
import { pageMetadata } from "@/lib/page-metadata";
import { TermsContent } from "@/components/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata((await pageLocale()).locale, "terms");
}

export default function TermsPage() {
  return <TermsContent />;
}
