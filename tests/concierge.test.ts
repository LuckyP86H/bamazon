import { describe, expect, test } from "bun:test";
import type { AiEnv } from "../src/lib/ai";
import {
  MAX_FILTER_CENTS,
  describeFilters,
  fallbackFilters,
  sanitizeFilters,
  translateQuery,
  type ShopFilters,
} from "../src/lib/concierge";
import { listProducts } from "../src/lib/db";
import { testDb } from "./support";

const departments = [
  { id: 1, name: "Electronics" },
  { id: 2, name: "Books" },
  { id: 3, name: "Clothing" },
  { id: 4, name: "Home & Kitchen" },
  { id: 5, name: "Sports & Outdoors" },
];

const env: AiEnv = {
  AI_PROVIDER: "Fixture",
  AI_BASE_URL: "https://fixture.test/v1",
  AI_MODEL: "fixture-1",
};

/** A fake provider that answers from a script, keyed by the shopper's exact words. */
function fixtureFetch(canned: Record<string, unknown>) {
  return (async (_url: unknown, init?: { body?: string }) => {
    const parsed = JSON.parse(init?.body ?? "{}") as {
      messages: { role: string; content: string }[];
    };
    const asked = parsed.messages.find((message) => message.role === "user")?.content ?? "";
    const payload = canned[asked];
    if (payload === undefined) throw new Error(`no fixture for: ${asked}`);
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;
}

/**
 * The golden set: fixed shopper sentences, the filters a good translation must
 * produce, and the canned model answers the fixture provider gives. It exercises
 * the whole parse → validate → sanitize pipeline without a real provider.
 */
const GOLDEN: { ask: string; model: unknown; filters: ShopFilters }[] = [
  {
    ask: "a gift under $50 for someone who hikes",
    model: { keywords: "hiking", maxPriceCents: 5000 },
    filters: { search: "hiking", maxPriceCents: 5000, sort: "featured" },
  },
  {
    ask: "the cheapest books",
    model: { department: "Books", sort: "price-asc" },
    filters: { departmentId: 2, sort: "price-asc" },
  },
  {
    ask: "a TV over $100",
    model: { department: "Electronics", keywords: "TV", minPriceCents: 10000 },
    filters: { search: "TV", departmentId: 1, minPriceCents: 10000, sort: "featured" },
  },
  {
    ask: "kitchen things between $20 and $60",
    model: { department: "Home & Kitchen", minPriceCents: 2000, maxPriceCents: 6000 },
    filters: { departmentId: 4, minPriceCents: 2000, maxPriceCents: 6000, sort: "featured" },
  },
  {
    ask: "something warm to wear",
    model: { department: "Clothing", keywords: "warm" },
    filters: { search: "warm", departmentId: 3, sort: "featured" },
  },
  {
    ask: "yoga gear",
    model: { department: "Sports & Outdoors", keywords: "yoga" },
    filters: { search: "yoga", departmentId: 5, sort: "featured" },
  },
  {
    ask: "the most expensive laptop you have",
    model: { keywords: "laptop", sort: "price-desc" },
    filters: { search: "laptop", sort: "price-desc" },
  },
  {
    ask: "a notebook under $15",
    model: { keywords: "notebook", maxPriceCents: 1500 },
    filters: { search: "notebook", maxPriceCents: 1500, sort: "featured" },
  },
  {
    ask: "running socks",
    model: { department: "Clothing", keywords: "running socks" },
    filters: { search: "running socks", departmentId: 3, sort: "featured" },
  },
  {
    ask: "a charger for my phone",
    model: { keywords: "charger phone" },
    filters: { search: "charger phone", sort: "featured" },
  },
];

describe("the golden set (fixture provider)", () => {
  const canned = Object.fromEntries(GOLDEN.map((entry) => [entry.ask, entry.model]));
  for (const entry of GOLDEN) {
    test(`“${entry.ask}”`, async () => {
      const { filters, origin } = await translateQuery(
        env,
        entry.ask,
        departments,
        fixtureFetch(canned),
      );
      expect(origin).toEqual({ source: "llm", provider: "Fixture", model: "fixture-1" });
      expect(filters).toEqual(entry.filters);
    });
  }

  test("the translated filters execute against the real catalogue", async () => {
    const { db } = testDb();
    const cannedWater = {
      "a water bottle under $30": { keywords: "water bottle", maxPriceCents: 3000 },
    };
    const water = await translateQuery(
      env,
      "a water bottle under $30",
      departments,
      fixtureFetch(cannedWater),
    );
    const waterResults = await listProducts(db, { ...water.filters });
    expect(waterResults.map((p) => p.id)).toEqual(["SPT BTL02"]);
    expect(waterResults.every((p) => p.price_cents <= 3000)).toBe(true);

    const cannedBooks = { "books under $15": { department: "Books", maxPriceCents: 1500 } };
    const books = await translateQuery(
      env,
      "books under $15",
      departments,
      fixtureFetch(cannedBooks),
    );
    const bookResults = await listProducts(db, { ...books.filters });
    expect(bookResults.map((p) => p.id).sort()).toEqual(["BOO HP12", "BOO NOTE"]);
  });
});

describe("sanitizeFilters", () => {
  test("an unknown department is dropped, and unknown fields never survive", () => {
    const filters = sanitizeFilters(
      { department: "Garden", maxPriceCents: 2500, colour: "red" },
      departments,
    );
    expect(filters.departmentId).toBeUndefined();
    expect(filters.maxPriceCents).toBe(2500);
    expect(Object.keys(filters).sort()).toEqual(["maxPriceCents", "sort"]);
  });

  test("prices clamp to the sane range and a backwards range is swapped", () => {
    expect(sanitizeFilters({ maxPriceCents: 999_999_999 }, departments).maxPriceCents).toBe(
      MAX_FILTER_CENTS,
    );
    const swapped = sanitizeFilters({ minPriceCents: 9000, maxPriceCents: 1000 }, departments);
    expect(swapped.minPriceCents).toBe(1000);
    expect(swapped.maxPriceCents).toBe(9000);
  });

  test("a department name matches case-insensitively", () => {
    expect(sanitizeFilters({ department: "books" }, departments).departmentId).toBe(2);
  });

  test("an unknown sort falls back to featured", () => {
    expect(sanitizeFilters({ sort: "newest" }, departments).sort).toBe("featured");
  });

  test("shapeless JSON is rejected so the caller can fall back", () => {
    expect(() => sanitizeFilters({ keywords: 42 }, departments)).toThrow();
    expect(() => sanitizeFilters("just words", departments)).toThrow();
  });
});

describe("the deterministic fallback", () => {
  test("no provider configured: words, prices and departments are read plainly", async () => {
    const { filters, origin } = await translateQuery({}, "a water bottle under $30", departments);
    expect(origin).toEqual({ source: "fallback" });
    expect(filters).toEqual({ search: "water bottle", maxPriceCents: 3000, sort: "featured" });
  });

  test("fallback reads sort hints and departments", () => {
    expect(fallbackFilters("the cheapest books", departments)).toEqual({
      departmentId: 2,
      sort: "price-asc",
    });
    expect(fallbackFilters("electronics over $100", departments)).toEqual({
      departmentId: 1,
      minPriceCents: 10000,
      sort: "featured",
    });
  });

  test("fallback reads a between-range and executes it", async () => {
    const { db } = testDb();
    const filters = fallbackFilters("something for the kitchen between $20 and $40", departments);
    expect(filters).toEqual({
      departmentId: 4,
      minPriceCents: 2000,
      maxPriceCents: 4000,
      sort: "featured",
    });
    const results = await listProducts(db, { ...filters });
    expect(results.map((p) => p.id)).toEqual(["HOM MUG03"]);
  });

  test("a failing provider lands on the fallback, labelled as such", async () => {
    const broken = (async () => new Response("down", { status: 503 })) as unknown as typeof fetch;
    const { filters, origin } = await translateQuery(
      env,
      "the cheapest books",
      departments,
      broken,
    );
    expect(origin).toEqual({ source: "fallback" });
    expect(filters).toEqual({ departmentId: 2, sort: "price-asc" });
  });

  test("a model that answers prose instead of JSON lands on the fallback", async () => {
    const chatty = (async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "Sure! Books are great." } }] }),
        {
          status: 200,
        },
      )) as unknown as typeof fetch;
    const { origin } = await translateQuery(env, "the cheapest books", departments, chatty);
    expect(origin).toEqual({ source: "fallback" });
  });
});

describe("describeFilters", () => {
  test("renders the filters a shopper can read back", () => {
    expect(
      describeFilters({ departmentId: 2, maxPriceCents: 1500, sort: "price-asc" }, departments),
    ).toEqual(["Department: Books", "Under $15.00", "Sorted by price: low to high"]);
  });
});
