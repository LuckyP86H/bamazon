import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Db, Statement } from "../src/lib/db";

/** An in-memory database with the real migrations and seed applied, behind the app's Db interface. */
export function testDb(withSeed = true): { db: Db; raw: Database } {
  const raw = new Database(":memory:", { strict: true });
  raw.run("PRAGMA foreign_keys = ON;");
  const dir = join(import.meta.dir, "..", "migrations");
  for (const file of readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    raw.run(readFileSync(join(dir, file), "utf8"));
  }
  if (withSeed) raw.run(readFileSync(join(import.meta.dir, "..", "seed", "products.sql"), "utf8"));

  const db: Db = {
    async all<T>(sql: string, params: unknown[] = []) {
      return raw.query(sql).all(...(params as never[])) as T[];
    },
    async first<T>(sql: string, params: unknown[] = []) {
      return (raw.query(sql).get(...(params as never[])) as T | null) ?? null;
    },
    async run(sql: string, params: unknown[] = []) {
      const result = raw.query(sql).run(...(params as never[]));
      return { changes: result.changes };
    },
    async batch(statements: Statement[]) {
      // D1 batches are all-or-nothing; a transaction gives the same guarantee here.
      raw.run("BEGIN");
      try {
        for (const s of statements) raw.query(s.sql).run(...(s.params as never[]));
        raw.run("COMMIT");
      } catch (error) {
        raw.run("ROLLBACK");
        throw error;
      }
    },
  };
  return { db, raw };
}
