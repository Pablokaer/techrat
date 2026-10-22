import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { LandingStructuredData } from "@/components/structured-data";
import { landingMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = landingMetadata("pt-BR");

/**
 * The Portuguese URL of the landing page. It is always in Portuguese, whatever the visitor's saved language, so search
 * engines (which send no language) can index it: app/pt-BR/layout.tsx fixes the language of the whole /pt-BR tree.
 * Choosing another language here still works, as anywhere else.
 */
export default function PortugueseLandingPage() {
  return (
    <>
      <LandingStructuredData locale="pt-BR" />
      <Landing />
    </>
  );
}
