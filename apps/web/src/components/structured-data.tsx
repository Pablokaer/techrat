import type { Locale } from "@/i18n/config";
import { landingStructuredData } from "@/lib/site-metadata";

/** JSON-LD for search engines. `<` is escaped so no text in the data can close the script tag. */
export function LandingStructuredData({ locale }: { locale: Locale }) {
  const json = JSON.stringify(landingStructuredData(locale)).replace(/</g, "\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
