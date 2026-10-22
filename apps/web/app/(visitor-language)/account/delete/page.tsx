import type { Metadata } from "next";
import { pageLocale } from "@/i18n/server";
import { pageMetadata } from "@/lib/page-metadata";
import { AccountDeleteContent } from "@/components/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata((await pageLocale()).locale, "accountDelete");
}

export default function AccountDeletePage() {
  return <AccountDeleteContent />;
}
