/**
 * Security headers of the web app (ADR-0029). The API already sends its own; these cover the pages Next.js serves.
 * Kept apart from next.config.ts so the unit tests can read them.
 */
export type Header = { key: string; value: string };

/**
 * Pages run only code from this origin, talk only to this origin (the API is proxied under /api, the real-time hub
 * under /hubs) and cannot be framed, given a foreign <base>, post forms elsewhere or load plugins. Next.js needs
 * inline scripts and styles to hydrate, hence 'unsafe-inline' (a nonce per request would remove it, at the cost of
 * rendering every page dynamically). Images may come from any https site because avatars can be external links.
 * No `upgrade-insecure-requests`: it would break the production build served over plain http on localhost (Compose, e2e);
 * HSTS already makes browsers use https on a real domain.
 */
export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(production: boolean): Header[] {
  const headers: Header[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
  // The dev server needs eval and plain http, so the policy and HSTS are for production builds only.
  if (production) {
    headers.push(
      { key: "Content-Security-Policy", value: contentSecurityPolicy() },
      { key: "Strict-Transport-Security", value: "max-age=31536000" },
    );
  }
  return headers;
}
