# ADR-0004: React + Next.js for the web client

**Status:** Accepted

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + React Query + Recharts.

- Authenticated pages are client components; data comes from the API through the generated typed client.
- The web server proxies `/api/*` and `/hubs/*` to the backend, so the browser talks to one origin and authentication uses an **HttpOnly, SameSite=Strict cookie** — tokens never reach JavaScript.
- Routes use query strings (`/topic?slug=…`) instead of dynamic segments so the same codebase can be **statically exported** for the desktop app (ADR-0006).
- Design tokens live in `@techrat/theme` and are mirrored as Tailwind `@theme` variables.
