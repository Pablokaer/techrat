import type { Metadata } from "next";

/**
 * Confirm email, forgot and reset password are reached from emails or other pages and mean nothing in search results,
 * so they are `noindex` (links are still followed). Sign in and register override this in their own layouts.
 */
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthPagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
