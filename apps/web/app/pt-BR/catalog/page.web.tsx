import type { Metadata } from "next";
import { CatalogIndexPage, catalogIndexMetadata } from "@/components/public-catalog";

// Web build only (".web.tsx", see next.config.ts): the desktop app has its own signed-in catalog.
export async function generateMetadata(): Promise<Metadata> {
  return catalogIndexMetadata("pt-BR");
}

export default async function CatalogRoute() {
  return CatalogIndexPage({ locale: "pt-BR" });
}
