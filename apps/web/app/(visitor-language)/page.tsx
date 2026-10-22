import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { LandingStructuredData } from "@/components/structured-data";
import { pageLocale } from "@/i18n/server";
import { landingMetadata } from "@/lib/public-pages";

/** `/` is the English URL for search engines (see publicPages.landing); visitors still see it in their own language. */
export async function generateMetadata(): Promise<Metadata> {
  return landingMetadata((await pageLocale()).locale, "en");
}

export default function LandingPage() {
  return (
    <>
      <LandingStructuredData locale="en" />
      <Landing />
    </>
  );
}
