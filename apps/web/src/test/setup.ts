import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Realtime is optional; in tests it must never open sockets.
vi.mock("@microsoft/signalr", () => { throw new Error("signalr disabled in tests"); });
// No real network: any unexpected request answers 401.
vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ title: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/problem+json" } })));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  // Throws like Next.js does, so server pages can be tested for their 404.
  notFound: () => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  },
}));
// jsdom has no layout: scrolling is a no-op that tests can spy on.
Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn() as typeof window.scrollTo;
