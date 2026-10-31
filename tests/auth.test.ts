import { describe, expect, test } from "bun:test";
import {
  currentStaff,
  isStaffLogin,
  openStaffSession,
  sha256Hex,
  staffAllowlist,
  SESSION_MS,
  closeStaffSession,
} from "../src/lib/auth";
import { testDb } from "./support";

describe("staff allowlist", () => {
  const env = { STAFF_GITHUB_LOGINS: " Alice , bob,, " };

  test("parses a comma list, trimmed and lowercased", () => {
    expect([...staffAllowlist(env)].sort()).toEqual(["alice", "bob"]);
  });

  test("matches logins regardless of case, and rejects everyone else", () => {
    expect(isStaffLogin(env, "ALICE")).toBe(true);
    expect(isStaffLogin(env, "mallory")).toBe(false);
    expect(isStaffLogin({}, "alice")).toBe(false);
  });
});

describe("staff sessions", () => {
  test("a session token opens the back office until it expires", async () => {
    const { db } = testDb(false);
    const token = await openStaffSession(db, "alice", 1_000);
    expect(await currentStaff(db, token, 1_000 + 1)).toBe("alice");
    expect(await currentStaff(db, token, 1_000 + SESSION_MS + 1)).toBeNull();
  });

  test("only a hash is stored, never the token itself", async () => {
    const { db, raw } = testDb(false);
    const token = await openStaffSession(db, "alice", 1_000);
    const stored = raw.query("SELECT token_hash FROM staff_sessions").all() as {
      token_hash: string;
    }[];
    expect(stored).toHaveLength(1);
    expect(stored[0]?.token_hash).toBe(await sha256Hex(token));
    expect(stored[0]?.token_hash).not.toBe(token);
  });

  test("a made-up or missing token gets nothing, and signing out ends a real one", async () => {
    const { db } = testDb(false);
    expect(await currentStaff(db, "forged", 1_000)).toBeNull();
    expect(await currentStaff(db, undefined, 1_000)).toBeNull();
    const token = await openStaffSession(db, "alice", 1_000);
    await closeStaffSession(db, token);
    expect(await currentStaff(db, token, 1_000)).toBeNull();
  });
});
