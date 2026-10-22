import type { Metadata } from "next";
import { pageLocale } from "@/i18n/server";
import { accountPageMetadata } from "@/lib/public-pages";

/** Indexable, with its own title and link preview in the visitor's language (see accountPageMetadata). */
export async function generateMetadata(): Promise<Metadata> {
  return accountPageMetadata((await pageLocale()).locale, "login");
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
