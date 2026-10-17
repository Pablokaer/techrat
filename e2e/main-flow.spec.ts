import { expect, test, type Locator, type Page } from "@playwright/test";
import { confirmAndSignIn } from "./email";

const password = "Passw0rdX";

async function topbarXp(page: Page) {
  const text = await page.getByTitle("Total XP").innerText();
  return Number(text.replace(/[^0-9]/g, ""));
}

/** The text of an answer option, without its letter or the "Correct answer" / "Your answer" badge. */
const optionText = async (option: Locator) => (await option.locator("span.flex-1").innerText()).trim();

/**
 * Answers the current question: the option whose text is exactly `knownAnswer`, or the first one. Matching the whole text
 * matters, since one option can contain another's text (and options are shuffled on every question).
 */
async function answer(page: Page, knownAnswer?: string) {
  const options = page.getByRole("radiogroup", { name: "Answer options" }).getByRole("radio");
  const texts = await Promise.all((await options.all()).map(optionText));
  const pick = knownAnswer === undefined ? 0 : texts.indexOf(knownAnswer);
  expect(pick, `"${knownAnswer}" should be one of ${JSON.stringify(texts)}`).toBeGreaterThanOrEqual(0);
  await options.nth(pick).click();
  await page.getByRole("button", { name: /submit answer/i }).click();
  const status = page.getByRole("status").filter({ hasText: /Correct!|Incorrect/ });
  await expect(status).toBeVisible();
  const correct = (await status.innerText()).includes("Correct!");
  const correctText = await optionText(options.filter({ hasText: "Correct answer" }));
  return { correct, correctText };
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

  // Answer every question, remembering the correct answers each one reveals. A question seen before is answered with
  // its revealed answer, so it must be right. If luck fails, practise again until one answer is right: missed questions
  // come back, but mixed with new ones and in any order.
  const learned = new Map<string, string>();
  let earned = false;
  for (let session = 1; !earned; session++) {
    expect(session, "no correct answer after 5 practice sessions").toBeLessThanOrEqual(5);
    if (session > 1) {
      await page.getByRole("link", { name: /practice again/i }).click();
      await page.getByRole("button", { name: /start practice/i }).click();
      await expect(page).toHaveURL(/\/practice\/session/);
    }
    for (;;) {
      const q = (await page.locator("main [class*='sm:text-xl']").first().innerText()).trim();
      const known = learned.get(q);
      const r = await answer(page, known);
      if (known !== undefined) expect(r.correct, `the remembered answer to "${q}"`).toBe(true);
      learned.set(q, r.correctText);
      if (r.correct) earned = true;
      const next = page.getByRole("button", { name: /next question|see results/i });
      const last = (await next.innerText()).includes("See results");
      await next.click();
      if (last) break;
    }
    await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
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
