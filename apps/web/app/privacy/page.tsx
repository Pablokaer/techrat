import type { Metadata } from "next";
import { requestLocale } from "@/i18n/server";
import { pageMetadata } from "@/lib/page-metadata";
import { PrivacyContent } from "@/components/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await requestLocale(), "privacy");
}

export default function PrivacyPage() {
  return <PrivacyContent />;
}
