import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** Mailpit is the SMTP sink of the Compose stack: every email the API sends lands there (README, "Run locally"). */
const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";

type Listed = { ID: string; Subject: string };

/** Waits for an email to `to` whose subject matches, and returns its plain-text body. */
export async function waitForEmail(request: APIRequestContext, to: string, subject: RegExp): Promise<string> {
  for (let attempt = 0; attempt < 150; attempt++) {
    const list = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages = [] } = (await list.json()) as { messages?: Listed[] };
    const hit = messages.find((m) => subject.test(m.Subject));
    if (hit) {
      const full = await request.get(`${MAILPIT}/api/v1/message/${hit.ID}`);
      return ((await full.json()) as { Text: string }).Text;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No email to ${to} with a subject matching ${subject}`);
}

/** The link in the confirmation email (English or Portuguese), as a URL. */
export async function confirmationLink(request: APIRequestContext, email: string): Promise<URL> {
  const body = await waitForEmail(request, email, /Confirm your TechRat account|Confirme sua conta no TechRat/);
  const link = /https?:\/\/\S+\/confirm-email\?\S+/.exec(body)?.[0];
  if (!link) throw new Error(`No confirmation link in the email to ${email}`);
  return new URL(link);
}

/** Follows the link of the confirmation email in the browser, the way a person does. */
export async function followConfirmationLink(page: Page, email: string) {
  const link = await confirmationLink(page.request, email);
  await page.goto(`${link.pathname}${link.search}`);
}

/**
 * Finishes a sign-up done in English: the page asks to check the email, the link is followed, and the account signs in.
 * (An account cannot sign in until its email is confirmed.)
 */
export async function confirmAndSignIn(page: Page, email: string, password: string) {
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await followConfirmationLink(page, email);
  await expect(page.getByRole("status")).toContainText("Your email is confirmed");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
