import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";
import { Providers } from "@/components/providers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, matchLocale, parseAcceptLanguage, type Locale } from "@/i18n/config";
import "./globals.css";

// Self-hosted (OFL) so builds work offline, in CI, behind proxies and inside the Tauri desktop app.
const inter = localFont({ src: "./fonts/Inter-Variable.woff2", variable: "--font-inter", display: "swap", weight: "100 900" });
const mono = localFont({ src: "./fonts/JetBrainsMono-Variable.woff2", variable: "--font-jetbrains", display: "swap", weight: "100 800" });

// The desktop build is a static export: there is no request to read, so the client detects the locale itself.
const isDesktop = process.env.BUILD_TARGET === "desktop";

/** Web: the saved choice (cookie), else the browser's Accept-Language. */
async function requestLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return matchLocale(parseAcceptLanguage((await headers()).get("accept-language")));
}

const META: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "TechRat — Learn. Practice. Level Up.",
    description: "A gamified learning platform for tomorrow's builders: questions, roadmaps, XP, levels and rankings for every tech career.",
  },
  "pt-BR": {
    title: "TechRat — Aprenda. Pratique. Suba de nível.",
    description: "Uma plataforma gamificada de aprendizado para quem vai construir o futuro: questões, roadmaps, XP, níveis e rankings para todas as carreiras de tecnologia.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const meta = META[isDesktop ? DEFAULT_LOCALE : await requestLocale()];
  return { title: { default: meta.title, template: "%s · TechRat" }, description: meta.description, applicationName: "TechRat" };
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
