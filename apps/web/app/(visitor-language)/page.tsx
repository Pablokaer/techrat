import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { LandingStructuredData } from "@/components/structured-data";
import { pageLocale } from "@/i18n/server";
import { LANDING_PATHS, landingMetadata } from "@/lib/site-metadata";

/** `/` is the English URL for search engines (see LANDING_PATHS); visitors still see it in their own language. */
export async function generateMetadata(): Promise<Metadata> {
  return landingMetadata((await pageLocale()).locale, LANDING_PATHS.en);
}

export default function LandingPage() {
  return (
    <>
      <LandingStructuredData locale="en" />
      <Landing />
    </>
  );
}
