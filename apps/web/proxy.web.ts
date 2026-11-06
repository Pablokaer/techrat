import { NextResponse, type NextRequest } from "next/server";
import { MARKDOWN_CONTENT_TYPE, isKnownRoute, landingMarkdown, notFoundMarkdown, prefersMarkdown } from "@/lib/agent-content";

/**
 * Markdown for AI agents (ADR-0046). A request that asks for `Accept: text/markdown` gets the landing page (`/`,
 * `/pt-BR`) as Markdown, and a path that matches no page gets a 404 with a Markdown body; every other request, and every
 * browser, goes on to Next.js unchanged. The Markdown answers say `Vary: Accept` so no cache hands them to a browser;
 * the HTML ones are `no-store`, so never cached (Next.js replaces any `Vary` set here or in next.config.ts with its own).
 *
 * Web build only (`.web.ts`, see pageExtensions in next.config.ts): the desktop static export has no server to run it.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const landing = pathname === "/" ? "en" : pathname === "/pt-BR" ? "pt-BR" : null;
  const known = isKnownRoute(pathname);
  const negotiated = landing !== null || !known;

  if (negotiated && prefersMarkdown(request.headers.get("accept"))) {
    const body = landing ? landingMarkdown(landing) : notFoundMarkdown(request.headers.get("accept-language"));
    return new NextResponse(body, {
      status: landing ? 200 : 404,
      headers: { "Content-Type": MARKDOWN_CONTENT_TYPE, Vary: "Accept, Accept-Language", "Cache-Control": "no-cache" },
    });
  }
  return NextResponse.next();
}

// Next.js finds the function by default export when the file name carries a page extension (`proxy.web.ts`).
export default proxy;

export const config = {
  // Pages only: not the API and hub (proxied to the back end), Next.js assets, or files such as /llms.txt and images.
  matcher: ["/((?!api/|hubs/|_next/|.*\\.[^/]+$).*)"],
};
