import type { Metadata } from "next";
import { pageLocale } from "@/i18n/server";
import { legalPageMetadata } from "@/lib/public-pages";
import { PrivacyContent } from "@/components/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  return legalPageMetadata((await pageLocale()).locale, "privacy");
}

export default function PrivacyPage() {
  return <PrivacyContent />;
}
