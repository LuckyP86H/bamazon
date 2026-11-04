/**
 * Records docs/bamazon-ai-tour.gif from the real app: builds it, resets the local database,
 * starts `wrangler dev`, and walks the AI features — the concierge, a real checkout (which
 * gives the merchandising judge real sales to judge), the merchandising panel with a
 * deal-of-the-day approval, and a description draft.
 *
 * No AI provider is configured for the recording, so what it shows is honest: the concierge
 * is answered by the labelled plain matcher, the panel by the labelled demo judge, and the
 * draft is the labelled template.
 *
 *   bun run gif:ai        (needs ffmpeg on the PATH)
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
const out = join(root, "docs", "bamazon-ai-tour.gif");
const frames = mkdtempSync(join(tmpdir(), "bamazon-ai-gif-"));

execSync("bun run build", { cwd: root, stdio: "inherit" });
execSync("bun run db:reset:preview", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CI: "1" },
});

const server = spawn(
  "bun",
  [
    "x",
    "wrangler",
    "dev",
    "-c",
    "dist/server/wrangler.json",
    "--ip",
    "127.0.0.1",
    "--port",
    String(PORT),
  ],
  { cwd: root, stdio: "ignore", detached: true },
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

  // The concierge: a sentence in, filtered results out (plain matcher, labelled).
  await page.goto("/");
  await page.getByLabel("Or describe what you're looking for").fill("a water bottle under $30");
  await snap(page, 1100);
  await page.getByRole("button", { name: "Ask the concierge" }).click();
  await snap(page, 1300);

  // A real purchase of 30 bottles — the sales velocity the judge will read.
  await page.goto("/products/SPT%20BTL02");
  await page.getByLabel("Quantity").fill("30");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: /Cart/ }).click();
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: /Place order/ }).click();
  await snap(page, 1300);

  // The back office: urgency scores, then the deal approval click.
  const staff = await browser.newContext({ viewport: { width: 980, height: 620 }, baseURL: BASE });
  await staff.addCookies([{ name, value, url: BASE }]);
  const back = await staff.newPage();
  await back.goto("/manage/merchandising");
  await snap(back, 1400);
  const feature = back.getByRole("button", { name: "Feature it as the deal of the day" });
  await feature.scrollIntoViewIfNeeded();
  await snap(back, 1100);
  await feature.click();
  await snap(back, 1300);

  // The deal, live on the shop floor.
  await page.goto("/");
  await snap(page, 1300);

  // A description draft filling the add-product form (template, labelled).
  await back.goto("/manage");
  await back.getByLabel("Name (for the draft)").fill("Trail Running Shoes");
  await back.getByLabel("Department (for the draft)").selectOption({ label: "Sports & Outdoors" });
  await snap(back, 1100);
  await back.getByRole("button", { name: "Draft the description" }).click();
  const description = back.getByLabel("Description");
  await description.scrollIntoViewIfNeeded();
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
