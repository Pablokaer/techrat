import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { requestLocale } from "@/i18n/server";
import { buildMetadata } from "@/lib/site-metadata";
import "./globals.css";

// Self-hosted (OFL) so builds work offline, in CI, behind proxies and inside the Tauri desktop app.
const inter = localFont({ src: "./fonts/Inter-Variable.woff2", variable: "--font-inter", display: "swap", weight: "100 900" });
const mono = localFont({ src: "./fonts/JetBrainsMono-Variable.woff2", variable: "--font-jetbrains", display: "swap", weight: "100 800" });

// The desktop build is a static export: there is no request to read, so the client detects the locale itself.
const isDesktop = process.env.BUILD_TARGET === "desktop";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata(isDesktop ? DEFAULT_LOCALE : await requestLocale());
}

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = isDesktop ? undefined : await requestLocale();
  return (
    <html lang={locale ?? DEFAULT_LOCALE} className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-bg text-text">
        <Providers initialLocale={locale} detectLocale={isDesktop}>{children}</Providers>
      </body>
    </html>
  );
}
