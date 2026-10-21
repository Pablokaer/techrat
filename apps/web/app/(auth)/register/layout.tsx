import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { requestLocale } from "@/i18n/server";

const isDesktop = process.env.BUILD_TARGET === "desktop";

/** Stays indexable (people search for "TechRat register"), unlike the other account pages, with a title in the visitor's language. */
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = messages[isDesktop ? DEFAULT_LOCALE : await requestLocale()].auth.meta.register;
  return { title, description, robots: { index: true, follow: true }, alternates: { canonical: "/register" } };
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
