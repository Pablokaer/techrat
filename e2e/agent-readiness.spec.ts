import { expect, test } from "@playwright/test";

// What AI agents get from the running web server (ADR-0046): the proxy and /llms.txt only exist in a real build.

const markdown = { Accept: "text/markdown" };

test("the home page is Markdown for an agent that asks for it, and HTML for a browser", async ({ request }) => {
  const md = await request.get("/", { headers: markdown });
  expect(md.status()).toBe(200);
  expect(md.headers()["content-type"]).toBe("text/markdown; charset=utf-8");
  expect(md.headers()["vary"]).toMatch(/\bAccept\b/);
  expect(await md.text()).toMatch(/^# TechRat — /);

  const html = await request.get("/", { headers: { Accept: "text/html" } });
  expect(html.status()).toBe(200);
  expect(html.headers()["content-type"]).toContain("text/html");
});

test("an unknown URL is a 404 with a Markdown body for agents", async ({ request }) => {
  const res = await request.get("/__agent-404-probe", { headers: markdown });
  expect(res.status()).toBe(404);
  expect(res.headers()["content-type"]).toBe("text/markdown; charset=utf-8");
  expect(await res.text()).toContain("/llms.txt)");
});

test("llms.txt is served as text with a when-to-use section", async ({ request }) => {
  const res = await request.get("/llms.txt");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("text/plain; charset=utf-8");
  const body = await res.text();
  expect(body.startsWith("# TechRat\n\n> ")).toBe(true);
  expect(body).toContain("\n## When to use TechRat\n");
});
