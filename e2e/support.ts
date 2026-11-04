import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test as base, expect, type BrowserContext } from "@playwright/test";

/** A fresh local staff session, as the cookie the back office expects. */
function staffCookie(): { name: string; value: string } {
  const script = fileURLToPath(new URL("../scripts/local-staff-session.ts", import.meta.url));
  const line = execFileSync("bun", [script], { encoding: "utf8" }).trim();
  const [name = "", value = ""] = line.split("=");
  return { name, value };
}

export async function signInAsStaff(context: BrowserContext, baseURL: string | undefined) {
  const cookie = staffCookie();
  await context.addCookies([{ ...cookie, url: baseURL ?? "http://127.0.0.1:4321" }]);
}

/** Fails any test where the page logs an error or the app throws. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console: ${message.text()}`);
    });
    await use(page);
    expect(problems, "the browser console should stay clean").toEqual([]);
  },
});

export { expect };
