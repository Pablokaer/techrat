import { expect, test, type Page } from "@playwright/test";

const password = "Passw0rdX";

async function register(page: Page) {
  const username = `del_${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
  const email = `${username}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill("Delete Me");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return { username, email };
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click(); // Settings has a second sign-out button
  await expect(page).toHaveURL(/\/login/);
}

test("Settings → delete the account with the password → login page says so → the credentials no longer work", async ({ page }) => {
  const { email } = await register(page);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Delete account" })).toBeVisible();
  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete your account?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Your password")).toBeFocused();
  await dialog.getByLabel("Your password").fill(password);
  await dialog.getByRole("button", { name: "Delete account permanently" }).click();

  await expect(page).toHaveURL(/\/login/); // the login page removes the one-time deleted flag from the URL after showing it
  await expect(page.getByRole("status").filter({ hasText: "Your account was deleted" })).toBeVisible();

  // The session is gone: an authenticated page sends the visitor back to sign in.
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);

  // The same credentials fail now.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a wrong password shows an inline error and keeps the account", async ({ page }) => {
  const { email } = await register(page);

  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Your password").fill("Wr0ngPassword");
  await dialog.getByRole("button", { name: "Delete account permanently" }).click();
  await expect(dialog.getByLabel("Your password")).toHaveAttribute("aria-invalid", "true");
  await expect(dialog).toBeVisible();

  // Escape closes the dialog and the account still works.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await signOut(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("/account/delete is public: signed out it explains the deletion and returns here after signing in", async ({ page }) => {
  const { email } = await register(page);
  await signOut(page);

  await page.goto("/account/delete");
  await expect(page).toHaveURL(/\/account\/delete$/);
  await expect(page.getByRole("heading", { level: 1, name: "Delete your TechRat account" })).toBeVisible();
  await expect(page.getByText(/immediate and irreversible/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete my account" })).toHaveCount(0);

  await page.getByRole("link", { name: "Sign in to delete your account" }).click();
  await expect(page).toHaveURL(/\/login\?next=(\/|%2F)account(\/|%2F)delete/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/account\/delete$/);
  await expect(page.getByRole("button", { name: "Delete my account" })).toBeVisible();
});

test("the privacy policy and the terms are public and linked from the footer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Draft");
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms of Service" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeVisible();
});
