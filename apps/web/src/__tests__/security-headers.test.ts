import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "../../security-headers";

const value = (headers: { key: string; value: string }[], key: string) => headers.find((h) => h.key === key)?.value;

describe("Web security headers", () => {
  it("keeps the headers that were already sent", () => {
    for (const production of [true, false]) {
      const h = securityHeaders(production);
      expect(value(h, "X-Content-Type-Options")).toBe("nosniff");
      expect(value(h, "X-Frame-Options")).toBe("DENY");
      expect(value(h, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(value(h, "Permissions-Policy")).toContain("camera=()");
    }
  });

  it("sends a Content-Security-Policy in production that blocks framing, plugins, base tag hijacking and foreign forms", () => {
    const csp = value(securityHeaders(true), "Content-Security-Policy")!;
    for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"])
      expect(csp.split(";").map((d) => d.trim())).toContain(directive);
  });

  it("allows scripts only from the site itself, without eval", () => {
    const script = contentSecurityPolicy().split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src"))!;
    expect(script).toContain("'self'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(script).not.toMatch(/\bhttps?:|\*/);
  });

  it("lets the app reach its own API and real-time channel but no other origin", () => {
    const connect = contentSecurityPolicy().split(";").map((d) => d.trim()).find((d) => d.startsWith("connect-src"))!;
    expect(connect).toContain("'self'");
    expect(connect).not.toMatch(/\*|https:\/\/|http:/);
  });

  it("forces https for a long time in production", () => {
    const hsts = value(securityHeaders(true), "Strict-Transport-Security")!;
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(15_552_000);
  });

  it("adds neither the policy nor HSTS in development, where the dev server needs eval and plain http", () => {
    const h = securityHeaders(false);
    expect(value(h, "Content-Security-Policy")).toBeUndefined();
    expect(value(h, "Strict-Transport-Security")).toBeUndefined();
  });
});
