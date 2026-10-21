import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { requestLocale } from "@/i18n/server";

const isDesktop = process.env.BUILD_TARGET === "desktop";

/** Stays indexable (people search for "TechRat login"), unlike the other account pages, with a title in the visitor's language. */
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = messages[isDesktop ? DEFAULT_LOCALE : await requestLocale()].auth.meta.login;
  return { title, description, robots: { index: true, follow: true }, alternates: { canonical: "/login" } };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
