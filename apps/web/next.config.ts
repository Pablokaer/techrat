import type { NextConfig } from "next";
import { securityHeaders } from "./security-headers";

// Two build targets share one codebase:
//  - web (default): Node server, same-origin /api proxy to the backend so auth uses HttpOnly cookies.
//  - desktop (BUILD_TARGET=desktop): static export loaded by Tauri; talks to the API with bearer tokens.
const isDesktop = process.env.BUILD_TARGET === "desktop";
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:5080";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@techrat/api", "@techrat/auth", "@techrat/theme", "@techrat/types", "@techrat/ui", "@techrat/validation"],
  // There is no layout above every page (one root layout per owner of the page language, ADR-0040), so URLs that match
  // no route are answered by app/global-not-found.tsx.
  experimental: { globalNotFound: true },
  ...(isDesktop
    ? { output: "export", images: { unoptimized: true }, trailingSlash: true }
    : {
        output: "standalone",
        // Files named page.web.tsx are routes of the web build only: the public catalog (ADR-0036) renders on the server
        // from the API, which the desktop static export cannot do.
        pageExtensions: ["web.tsx", "web.ts", "tsx", "ts", "jsx", "js"],
        async rewrites() {
          return [
            { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
            { source: "/hubs/:path*", destination: `${apiUrl}/hubs/:path*` },
          ];
        },
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "production") }];
        },
      }),
};

export default config;
