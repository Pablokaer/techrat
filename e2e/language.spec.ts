import { expect, test } from "@playwright/test";
import { followConfirmationLink } from "./email";

// A browser set to Brazilian Portuguese gets the app in Portuguese; the EN/PT toggle switches it and the choice sticks.
test.use({ locale: "pt-BR" });

test("Portuguese browser → app in Portuguese → switch to English → choice persists", async ({ page }) => {
  const username = `pt_${Date.now().toString().slice(-8)}`;

  // Sign-in pages follow the browser language, including client and server messages.
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bem-vindo de volta");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Informe um e-mail válido")).toBeVisible();
  await page.getByLabel("E-mail").fill("nobody@example.com");
  await page.getByLabel("Senha").fill("Errada123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha inválidos." })).toBeVisible();

  // Register in Portuguese.
  await page.goto("/register");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Crie sua conta");
  await page.getByLabel("E-mail").fill(`${username}@example.com`);
  await page.getByLabel("Nome de usuário").fill(username);
  await page.getByLabel("Nome de exibição").fill("Rato PT");
  await page.getByLabel("Senha").fill("Passw0rdX");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
  await followConfirmationLink(page, `${username}@example.com`);
  await expect(page.getByRole("status")).toContainText("Seu e-mail foi confirmado");
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(`${username}@example.com`);
  await page.getByLabel("Senha").fill("Passw0rdX");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Catalog names come from the API in Portuguese.
  await page.getByRole("link", { name: "Aprender" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aprender");
  await expect(page.getByRole("link", { name: /Estruturas de Dados/ }).first()).toBeVisible();

  // Switch to English with the header toggle: UI and API data change without a reload.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Learn");
  await expect(page.getByRole("link", { name: /Data Structures/ }).first()).toBeVisible();

  // The choice wins over the browser language after a reload (cookie read by the server).
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Learn");

  // And back to Portuguese.
  await page.getByRole("button", { name: "PT", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aprender");
});
