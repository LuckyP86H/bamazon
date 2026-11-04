import AxeBuilder from "@axe-core/playwright";
import { expect, signInAsStaff, test } from "./support";

test("the back office asks anonymous visitors to sign in", async ({ page }) => {
  await page.goto("/manage");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
});

test("a manager restocks an item, adds a product and hides one", async ({
  page,
  context,
  baseURL,
}) => {
  await signInAsStaff(context, baseURL);
  await page.goto("/manage");
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();

  // Other projects run against the same database, so every value here is relative or unique.
  const row = page.getByRole("row", { name: /Cast-Iron Dutch Oven/ });
  const before = Number((await row.locator("td.stock").innerText()).trim());
  await row.getByLabel(/Units to add or remove/).fill("4");
  await row.getByRole("button", { name: "Update" }).click();
  await expect(page.getByRole("status")).toContainText("Stock updated.");
  await expect(
    page.getByRole("row", { name: /Cast-Iron Dutch Oven/ }).locator("td.stock"),
  ).toHaveText(String(before + 4));

  const sku = `E2E${Date.now().toString(36).toUpperCase()}`;
  const name = `E2E Book ${sku}`;
  await page.getByLabel("SKU").fill(sku);
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Price (USD)").fill("9.50");
  await page.getByLabel("Opening stock").fill("7");
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status")).toContainText(`Added ${name}.`);

  await page
    .getByRole("row", { name: new RegExp(sku) })
    .getByRole("button", { name: "Hide from shop" })
    .click();
  await expect(page.getByRole("status")).toContainText("Hidden from the shop.");
  await page.goto("/");
  await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
});

test("a supervisor sees profit worked out from sales and overhead", async ({
  page,
  context,
  baseURL,
}) => {
  await signInAsStaff(context, baseURL);
  await page.goto("/manage/departments");
  await expect(page.getByRole("heading", { name: "Department sales" })).toBeVisible();
  const books = page.getByRole("row", { name: /Books/ });
  await expect(books).toContainText("Overhead for Books");
  // Books have no sales in these tests, so profit is exactly minus the overhead set here.
  await books.getByLabel(/Overhead for Books/).fill("3000");
  await books.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Overhead saved.");
  await expect(page.getByRole("row", { name: /Books/ })).toContainText("−$3,000.00");

  const garden = `Garden ${Date.now().toString(36)}`;
  await page.getByLabel("Name", { exact: true }).fill(garden);
  await page.getByLabel("Overhead (USD)").fill("500");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("status")).toContainText(`Created ${garden}.`);
  await expect(page.getByRole("row", { name: new RegExp(garden) })).toBeVisible();
});

test("the back office passes WCAG 2.2 A/AA checks", async ({ page, context, baseURL }) => {
  await signInAsStaff(context, baseURL);
  for (const path of ["/manage", "/manage/departments"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations, path).toEqual([]);
  }
});
