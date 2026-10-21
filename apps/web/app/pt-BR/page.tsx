import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { LandingStructuredData } from "@/components/structured-data";
import { I18nProvider } from "@/i18n";
import { landingMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = landingMetadata("pt-BR");

/**
 * The Portuguese URL of the landing page. It is always in Portuguese, whatever the visitor's saved language, so search
 * engines (which send no language) can index it; choosing another language here still works, as anywhere else.
 */
export default function PortugueseLandingPage() {
  return (
    <I18nProvider initialLocale="pt-BR">
      <LandingStructuredData locale="pt-BR" />
      <Landing />
    </I18nProvider>
  );
}
