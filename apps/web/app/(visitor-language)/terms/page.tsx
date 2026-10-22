import type { Metadata } from "next";
import { pageLocale } from "@/i18n/server";
import { legalPageMetadata } from "@/lib/public-pages";
import { TermsContent } from "@/components/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  return legalPageMetadata((await pageLocale()).locale, "terms");
}

export default function TermsPage() {
  return <TermsContent />;
}
