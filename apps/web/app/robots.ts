import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/public-pages";

// Built once (it only depends on PUBLIC_WEB_URL); the desktop static export requires saying so.
export const dynamic = "force-static";

/**
 * /robots.txt. Private pages are not blocked here on purpose: they carry `noindex`, which crawlers can only read on a
 * page they are allowed to fetch. Only the API and the realtime hub, which are not pages, are kept out.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/hubs/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
