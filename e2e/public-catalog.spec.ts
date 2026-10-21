import { expect, test } from "@playwright/test";

// The public catalog is rendered on the server from the API (ADR-0036): this runs against the real images, where the
// web container must reach the API at runtime.

test("a visitor without an account browses the catalog: index, a roadmap and a topic", async ({ page }) => {
  const index = await page.goto("/catalog");
  expect(index?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Roadmaps and topics");

  await page.getByRole("region", { name: "Roadmaps" }).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/catalog\/roadmaps\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("roadmap");
  await expect(page.getByRole("link", { name: "Start this roadmap for free" })).toHaveAttribute("href", "/register");

  await page.getByRole("link", { name: /·/ }).first().click();
  await expect(page).toHaveURL(/\/catalog\/topics\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("interview questions");
});

test("the Portuguese catalog is in Portuguese and an unknown roadmap is a 404", async ({ page }) => {
  const res = await page.goto("/pt-BR/catalog");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Roadmaps e temas");
  expect((await page.goto("/catalog/roadmaps/does-not-exist"))?.status()).toBe(404);
});
