/**
 * Records docs/bamazon-tour.gif from the real app: builds it, resets the local database, starts
 * `wrangler dev`, walks through every main use case, and stitches the screenshots with ffmpeg.
 *
 *   bun run gif        (needs ffmpeg on the PATH)
 */
import { execFileSync, execSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";

const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;
const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "docs", "bamazon-tour.gif");
const frames = mkdtempSync(join(tmpdir(), "bamazon-gif-"));

execSync("bun run build", { cwd: root, stdio: "inherit" });
execSync("bun run db:reset:preview", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CI: "1" },
});

const server = spawn(
  "bunx",
  [
    "wrangler",
    "dev",
    "-c",
    "dist/server/wrangler.json",
    "--ip",
    "127.0.0.1",
    "--port",
    String(PORT),
  ],
  {
    cwd: root,
    stdio: "ignore",
    detached: true,
  },
);

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("the app did not start");
}

let shot = 0;
async function snap(page: Page, pause = 900) {
  await page.waitForTimeout(pause);
  shot++;
  await page.screenshot({ path: join(frames, `frame-${String(shot).padStart(3, "0")}.png`) });
}

try {
  await waitForServer();
  const script = join(root, "scripts", "local-staff-session.ts");
  const [name = "", value = ""] = execFileSync("bun", [script], { encoding: "utf8" })
    .trim()
    .split("=");

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  const shopper = await browser.newContext({
    viewport: { width: 980, height: 620 },
    baseURL: BASE,
  });
  const page = await shopper.newPage();

  // Shopping
  await page.goto("/");
  await snap(page, 1200);
  await page.getByRole("searchbox", { name: "Search products" }).fill("wolves");
  await page.getByRole("button", { name: "Search" }).click();
  await snap(page);
  await page.goto("/?dept=3");
  await snap(page);
  await page.goto("/products/SPT%20BTL02");
  await page.getByLabel("Quantity").fill("2");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await snap(page, 1200);
  await page.goto("/products/USB-C%2065W");
  await page.getByLabel("Quantity").fill("9");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await snap(page, 1200);
  await page.goto("/products/BOO%20HWN");
  await snap(page);

  // Cart and checkout
  await page.goto("/cart");
  await page.getByLabel("Quantity for Insulated Water Bottle, 750 ml").fill("3");
  await page.getByRole("button", { name: "Update" }).first().click();
  await snap(page);
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await snap(page);
  await page.getByRole("button", { name: /Place order/ }).click();
  await snap(page, 1200);

  // Staff: the sign-in page, then the back office
  const guest = await browser.newContext({ viewport: { width: 980, height: 620 }, baseURL: BASE });
  const guestPage = await guest.newPage();
  await guestPage.goto("/login");
  await snap(guestPage);
  await guest.close();

  const staff = await browser.newContext({ viewport: { width: 980, height: 620 }, baseURL: BASE });
  await staff.addCookies([{ name, value, url: BASE }]);
  const back = await staff.newPage();
  await back.goto("/manage");
  await snap(back, 1200);
  const row = back.getByRole("row", { name: /Cast-Iron Dutch Oven/ });
  await row.getByLabel(/Units to add or remove/).fill("10");
  await row.getByRole("button", { name: "Update" }).click();
  await snap(back, 1200);
  await back.getByLabel("SKU").fill("BOO TOUR01");
  await back.getByLabel("Name", { exact: true }).fill("Travel Guide to Lisbon");
  await back.getByLabel("Price (USD)").fill("18.00");
  await back.getByRole("button", { name: "Add product" }).click();
  await snap(back, 1200);

  await back.goto("/manage/departments");
  await snap(back, 1200);
  const books = back.getByRole("row", { name: /Books/ });
  await books.getByLabel(/Overhead for Books/).fill("3000");
  await books.getByRole("button", { name: "Save" }).click();
  await snap(back, 1400);

  await browser.close();
  mkdirSync(join(root, "docs"), { recursive: true });
  execSync(
    `ffmpeg -y -loglevel error -framerate 0.7 -i ${join(frames, "frame-%03d.png")} ` +
      `-vf "scale=760:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse" -loop 0 ${out}`,
    { stdio: "inherit" },
  );
  console.log(`wrote ${out} from ${shot} frames`);
} finally {
  if (server.pid) process.kill(-server.pid);
  rmSync(frames, { recursive: true, force: true });
}
