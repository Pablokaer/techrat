import { llmsTxt } from "@/lib/agent-content";

// Built once (it only depends on PUBLIC_WEB_URL); the desktop static export requires saying so.
export const dynamic = "force-static";

/** /llms.txt (llmstxt.org): what TechRat is and when an agent should use it, generated in src/lib/agent-content.ts. */
export function GET(): Response {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
