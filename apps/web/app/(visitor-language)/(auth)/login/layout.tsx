import type { Metadata } from "next";
import { messages } from "@/i18n/messages";
import { pageLocale } from "@/i18n/server";

/** Stays indexable (people search for "TechRat login"), unlike the other account pages, with a title in the visitor's language. */
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = messages[(await pageLocale()).locale].auth.meta.login;
  return { title, description, robots: { index: true, follow: true }, alternates: { canonical: "/login" } };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
