/** Server-only glue: the Cloudflare bindings and the D1 adapter. Tests never import this file. */
import { env } from "cloudflare:workers";
import type { Db } from "./db";

function fromD1(database: D1Database): Db {
  return {
    async all<T>(sql: string, params: unknown[] = []) {
      const result = await database
        .prepare(sql)
        .bind(...params)
        .all<T>();
      return result.results;
    },
    async first<T>(sql: string, params: unknown[] = []) {
      return database
        .prepare(sql)
        .bind(...params)
        .first<T>();
    },
    async run(sql: string, params: unknown[] = []) {
      const result = await database
        .prepare(sql)
        .bind(...params)
        .run();
      return { changes: result.meta.changes };
    },
    async batch(statements) {
      await database.batch(statements.map((s) => database.prepare(s.sql).bind(...s.params)));
    },
  };
}

export const db = (): Db => fromD1(env.DB);
export const bindings = env as unknown as {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  STAFF_GITHUB_LOGINS?: string;
  /** AI features (see src/lib/ai.ts and src/lib/judge.ts). All optional; unset means fallback. */
  AI_PROVIDER?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI_API_KEY?: string;
  TYPESAFE_API_KEY?: string;
  TYPESAFE_BASE_URL?: string;
  TYPESAFE_MODEL?: string;
};
