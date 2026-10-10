import { expect, test, type Page } from "@playwright/test";
import { confirmAndSignIn } from "./email";

const password = "Passw0rdX";

async function topbarXp(page: Page) {
  const text = await page.getByTitle("Total XP").innerText();
  return Number(text.replace(/[^0-9]/g, ""));
}

async function answer(page: Page, optionText?: string) {
  const options = page.getByRole("radiogroup", { name: "Answer options" }).getByRole("radio");
  if (optionText) await options.filter({ hasText: optionText }).first().click();
  else await options.first().click();
  await page.getByRole("button", { name: /submit answer/i }).click();
  const status = page.getByRole("status").filter({ hasText: /Correct!|Incorrect/ });
  await expect(status).toBeVisible();
  const correct = (await status.innerText()).includes("Correct!");
  const correctText = (await options.filter({ hasText: "Correct answer" }).innerText()).replace(/^[A-D]\s*/, "").replace(/\s*Correct answer\s*$/, "").trim();
  const question = (await page.locator("h1, .text-lg.font-semibold, .sm\\:text-xl").first().innerText()).trim();
  return { correct, correctText, question };
}

test("register → login → practice Data Structures → earn XP → progress → profile", async ({ page }) => {
  const username = `e2e_${Date.now().toString().slice(-8)}`;
  const email = `${username}@example.com`;

  // Register
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill("E2E Rat");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  // The account cannot sign in until the emailed link is followed.
  await confirmAndSignIn(page, email, password);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Rat");

  // Logout + Login
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const xpBefore = await topbarXp(page);
  expect(xpBefore).toBe(0);

  // Open Data Structures from Learn and start practice on a small subtopic (Queues)
  await page.getByRole("link", { name: "Learn" }).first().click();
  await page.getByRole("link", { name: /Data Structures/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Data Structures");
  await page.getByRole("link", { name: /^Queues/ }).click();
  await expect(page).toHaveURL(/\/practice\?topic=data-structures&subtopic=queues/);
  await page.getByRole("radiogroup", { name: "Number of questions" }).getByRole("radio", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: /start practice/i }).click();
  await expect(page).toHaveURL(/\/practice\/session/);

  // Answer every question in the session, remembering the revealed correct answers.
  const learned = new Map<string, string>();
  let earned = false;
  for (;;) {
    const q = (await page.locator("main [class*='sm:text-xl']").first().innerText()).trim();
    const r = await answer(page);
    learned.set(q, r.correctText);
    if (r.correct) earned = true;
    const next = page.getByRole("button", { name: /next question|see results/i });
    const last = (await next.innerText()).includes("See results");
    await next.click();
    if (last) break;
  }
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();

  // If luck failed, practise again: missed questions come back and we now know the answers.
  if (!earned) {
    await page.getByRole("link", { name: /practice again/i }).click();
    await page.getByRole("button", { name: /start practice/i }).click();
    await expect(page).toHaveURL(/\/practice\/session/);
    const q = (await page.locator("main [class*='sm:text-xl']").first().innerText()).trim();
    const r = await answer(page, learned.get(q));
    expect(r.correct).toBe(true);
  }

  // Received XP (question XP + daily streak bonus) is reflected in the top bar.
  await expect.poll(() => topbarXp(page)).toBeGreaterThan(5);
  const xpAfter = await topbarXp(page);

  // Progress: topic page shows activity
  await page.goto("/topic?slug=data-structures");
  await expect(page.getByText("Answered").first()).toBeVisible();
  await expect(page.getByText(/Level \d/).first()).toBeVisible();

  // Profile confirms the XP change
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Rat");
  await expect(page.getByText("Total XP").locator("..")).toContainText(String(xpAfter));
  expect(xpAfter).toBeGreaterThan(xpBefore);
});

test("mobile layout uses bottom navigation @mobile", async ({ page }) => {
  const username = `m_${Date.now().toString().slice(-8)}`;
  await page.goto("/register");
  await page.getByLabel("Email").fill(`${username}@example.com`);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await confirmAndSignIn(page, `${username}@example.com`, password);
  const bottomNav = page.locator("nav[aria-label='Main']").last();
  await expect(bottomNav).toBeVisible();
  await bottomNav.getByRole("link", { name: "Roadmaps" }).click();
  await expect(page).toHaveURL(/\/roadmaps/);
});
