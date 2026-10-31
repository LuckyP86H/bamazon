// Post-deploy smoke test: poll the deployed storefront until it answers
// HTTP 200 and serves the real shop page (hero copy + a seeded product),
// or fail after ~2 minutes. Run by .github/workflows/deploy.yml; can also
// be run by hand:  SMOKE_URL=https://… bun run smoke
//
// Exit codes: 0 = healthy, 1 = never became healthy, 2 = SMOKE_URL unset.

const url = process.env.SMOKE_URL;
if (!url) {
  console.error("SMOKE_URL is not set (the production environment's DEPLOY_URL variable).");
  process.exit(2);
}

const markers = ["Everything you were looking for, in one cart.", "TCL 32S305"];
const attempts = 12;
const delayMs = 10_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let last = "no response yet";
for (let attempt = 1; attempt <= attempts; attempt++) {
  try {
    const response = await fetch(url, { redirect: "follow" });
    const body = await response.text();
    if (response.status === 200) {
      const missing = markers.filter((marker) => !body.includes(marker));
      if (missing.length === 0) {
        console.log(`Smoke OK: ${url} returned 200 with the shop page and seeded catalogue.`);
        process.exit(0);
      }
      last = `HTTP 200 but missing marker(s): ${missing.join(" | ")}`;
    } else {
      last = `HTTP ${response.status}`;
    }
  } catch (error) {
    last = error instanceof Error ? error.message : String(error);
  }
  console.log(`Attempt ${attempt}/${attempts}: ${last}`);
  if (attempt < attempts) await sleep(delayMs);
}

console.error(`Smoke FAILED for ${url}: ${last}`);
process.exit(1);
export {};
