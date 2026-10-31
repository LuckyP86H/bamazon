import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("browse, search and filter the catalogue", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Everything you were looking for",
  );

  await page.getByRole("searchbox", { name: "Search products" }).fill("wolves");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(
    page.getByRole("link", { name: "History of Wolves: A Novel", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Classic Crew-Neck Cotton Tee", exact: true }),
  ).toHaveCount(0);

  await page.goto("/?dept=3");
  await expect(page.getByRole("link", { name: "Lightweight Rain Jacket" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "History of Wolves: A Novel", exact: true }),
  ).toHaveCount(0);

  await page.goto("/?sort=price-desc");
  const first = page.locator(".card .name a").first();
  await expect(first).toHaveText("Inspiron 3265 All-in-One Desktop");
});

test("out-of-stock items can't be bought", async ({ page }) => {
  await page.goto("/products/BOO%20HWN");
  await expect(page.getByText("Out of stock")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
  await expect(page.getByText("This item is sold out")).toBeVisible();
});

test("add to cart, change quantity, remove, and see the total", async ({ page }) => {
  await page.goto("/products/SPT%20BTL02");
  await page.getByLabel("Quantity").fill("2");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toContainText("Added");
  await expect(page.getByRole("link", { name: /Cart 2 items/ })).toBeVisible();

  await page.goto("/cart");
  await expect(page.locator(".summary dd.total")).toHaveText("$45.98");
  await page.getByLabel("Quantity for Insulated Water Bottle, 750 ml").fill("3");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page.locator(".summary dd.total")).toHaveText("$68.97");

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("a shopper can check out and see a receipt, and the stock goes down", async ({ page }) => {
  await page.goto("/products/CLO%20TEE01");
  const stockText = async () => (await page.locator(".stock").first().innerText()).trim();
  const before = Number((await stockText()).match(/^(\d+) in stock/)?.[1]);
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Add to cart" }).click();

  await page.getByRole("link", { name: /Cart/ }).click();
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: /Place order/ }).click();

  await expect(page.getByRole("heading", { name: /Thanks, Ada/ })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Classic Crew-Neck Cotton Tee");
  await expect(page.getByText("$19.99").first()).toBeVisible();

  await page.goto("/products/CLO%20TEE01");
  await expect(page.locator(".stock").first()).toHaveText(`${before - 1} in stock`);
});

test("the checkout form works with JavaScript turned off", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/products/HOM%20KNF02");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("No Script");
  await page.getByLabel("Email").fill("noscript@example.com");
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByRole("heading", { name: /Thanks, No/ })).toBeVisible();
  await context.close();
});

test("the shop passes WCAG 2.2 A/AA checks", async ({ page }) => {
  for (const path of ["/", "/products/MOUSE%203509", "/cart"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations, path).toEqual([]);
  }
});
