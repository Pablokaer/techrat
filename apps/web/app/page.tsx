import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { LandingStructuredData } from "@/components/structured-data";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { requestLocale } from "@/i18n/server";
import { LANDING_PATHS, landingMetadata } from "@/lib/site-metadata";

// The desktop build is a static export: there is no request to read the language from.
const isDesktop = process.env.BUILD_TARGET === "desktop";

/** `/` is the English URL for search engines (see LANDING_PATHS); visitors still see it in their own language. */
export async function generateMetadata(): Promise<Metadata> {
  return landingMetadata(isDesktop ? DEFAULT_LOCALE : await requestLocale(), LANDING_PATHS.en);
}

export default function LandingPage() {
  return (
    <>
      <LandingStructuredData locale="en" />
      <Landing />
    </>
  );
}
