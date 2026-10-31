/**
 * Local testing only: creates a staff session in the local D1 database of the built app (dist) and prints its cookie,
 * so the back office can be opened without a GitHub round-trip. Refuses to run against production.
 *
 *   bun run staff:local            # prints `bamazon_staff=<token>`
 */
import { $ } from "bun";

const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;

await $`bunx wrangler d1 execute DB --local -c dist/server/wrangler.json --command ${`INSERT INTO staff_sessions (token_hash, github_login, expires_at) VALUES ('${hash}', 'local-staff', ${expires})`}`.quiet();
console.log(`bamazon_staff=${token}`);
