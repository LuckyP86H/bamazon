import AxeBuilder from "@axe-core/playwright";
import { expect, signInAsStaff, test } from "./support";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("the concierge turns a sentence into filtered results, honestly labelled", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Or describe what you're looking for").fill("a water bottle under $30");
  await page.getByRole("button", { name: "Ask the concierge" }).click();

  await expect(page).toHaveURL(/\/concierge/);
  // No AI provider is configured for these tests, so the plain matcher answers —
  // and the page says so, with the exact filters it ran.
  await expect(page.getByText("Smart search isn't switched on")).toBeVisible();
  await expect(page.getByText("Under $30.00")).toBeVisible();
  await expect(page.getByRole("link", { name: "Insulated Water Bottle, 750 ml" })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
});

test("the merchandising panel renders with the labelled demo judge", async ({
  page,
  context,
  baseURL,
}) => {
  await signInAsStaff(context, baseURL);
  await page.goto("/manage/merchandising");
  await expect(
    page.getByRole("heading", { name: "Restock urgency & today's calls" }),
  ).toBeVisible();
  await expect(page.getByText("Demo judge.")).toBeVisible();
  await expect(page.getByRole("table", { name: "Products by restock urgency" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deal of the day" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Purchase-order draft" })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
});

test("a manager drafts a description and it only prefills the form", async ({
  page,
  context,
  baseURL,
}) => {
  await signInAsStaff(context, baseURL);
  await page.goto("/manage");
  await page.getByLabel("Name (for the draft)").fill("E2E Draft Widget");
  await page.getByRole("button", { name: "Draft the description" }).click();

  await expect(page.getByText("Template draft")).toBeVisible();
  await expect(page.getByLabel("Description")).toHaveValue(/E2E Draft Widget/);
  // Nothing was saved: no such product exists in the inventory table.
  await expect(page.getByRole("row", { name: /E2E Draft Widget/ })).toHaveCount(0);
});
