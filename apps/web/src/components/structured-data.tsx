import type { Locale } from "@/i18n/config";
import { landingStructuredData } from "@/lib/public-pages";

/** JSON-LD for search engines. `<` is escaped so no text in the data can close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}

export function LandingStructuredData({ locale }: { locale: Locale }) {
  return <JsonLd data={landingStructuredData(locale)} />;
}
