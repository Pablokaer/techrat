import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import type { PageLocale } from "@/i18n/server";
import { buildMetadata } from "@/lib/site-metadata";
import "./globals.css";

/*
 * The document shared by the root layouts (ADR-0040). The app has one root layout per owner of the page language:
 * app/(visitor-language) follows the visitor, app/pt-BR and app/catalog are fixed by their URL. Each one asks
 * `pageLocale()` once and hands the answer here, so `<html lang>` is right in the server HTML and there is exactly
 * one I18nProvider per page.
 */

// Self-hosted (OFL) so builds work offline, in CI, behind proxies and inside the Tauri desktop app.
const inter = localFont({ src: "./fonts/Inter-Variable.woff2", variable: "--font-inter", display: "swap", weight: "100 900" });
const mono = localFont({ src: "./fonts/JetBrainsMono-Variable.woff2", variable: "--font-jetbrains", display: "swap", weight: "100 800" });

export const rootViewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export const rootMetadata = ({ locale }: PageLocale): Metadata => buildMetadata(locale);

export function RootDocument({ page, children }: { page: PageLocale; children: React.ReactNode }) {
  return (
    <html lang={page.locale} className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-bg text-text">
        <Providers initialLocale={page.detect ? undefined : page.locale} detectLocale={page.detect}>{children}</Providers>
      </body>
    </html>
  );
}
