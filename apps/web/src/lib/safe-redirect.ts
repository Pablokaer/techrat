/**
 * Validates the `next` parameter that the login page follows after signing in. Only a path on this same origin is
 * accepted: anything else (`//host`, `https://host`, `javascript:`, a backslash or a control character that a
 * browser would normalise into `//`) would let a crafted link bounce a freshly signed-in user to another site
 * (open redirect). Returns the path unchanged when it is safe, otherwise `null` so the caller uses its default.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  // Backslashes and control characters (tab, newline…) are rewritten by URL parsers, so "/\t/host" becomes "//host".
  if (next.includes("\\") || /[\x00-\x1f\x7f]/.test(next)) return null;
  try {
    const base = "http://same-origin.invalid";
    return new URL(next, base).origin === base ? next : null;
  } catch {
    return null;
  }
}
