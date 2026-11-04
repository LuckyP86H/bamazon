/**
 * The shopping concierge: a shopper's sentence in, structured catalogue filters out.
 *
 * With an LLM configured, the model translates the sentence to JSON and this module
 * validates it against the store's real filter model (the same one `listProducts`
 * takes) before anything reaches a query. Without one — or when the model errors,
 * times out, or answers nonsense — a deterministic keyword translator answers
 * instead and says so, via the returned `origin`.
 *
 * Sanitizing rules, applied to every model answer:
 *  - unknown fields are stripped by the schema;
 *  - a department name counts only if it matches a department the store really has;
 *  - prices are whole cents, clamped to $0–$100,000, and a backwards range is swapped.
 */
import { z } from "zod";
import { FALLBACK_ORIGIN, aiConfig, chatJson, type AiEnv, type AiOrigin, type FetchFn } from "./ai";
import { isSortKey, type SortKey } from "./db";
import { formatUsd } from "./money";

/** The most the store will ever charge for one item, in cents. Filters clamp to it. */
export const MAX_FILTER_CENTS = 10_000_000;

export interface ShopFilters {
  search?: string;
  departmentId?: number;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort: SortKey;
}

interface Department {
  id: number;
  name: string;
}

/** The shape the model is asked for. Unknown keys are stripped, never passed on. */
const conciergeFilters = z.object({
  keywords: z.string().trim().min(1).max(80).optional(),
  department: z.string().trim().min(1).max(60).optional(),
  minPriceCents: z.number().finite().optional(),
  maxPriceCents: z.number().finite().optional(),
  sort: z.string().optional(),
});

const SORT_KEYS: SortKey[] = ["featured", "price-asc", "price-desc", "stock-asc"];

/** Matches a model-supplied department name to a real department, or nothing. */
function matchDepartment(name: string, departments: Department[]): Department | undefined {
  const wanted = name.trim().toLowerCase();
  return (
    departments.find((department) => department.name.toLowerCase() === wanted) ??
    departments.find(
      (department) =>
        department.name.toLowerCase().includes(wanted) ||
        wanted.includes(department.name.toLowerCase()),
    )
  );
}

const clampCents = (value: number) => Math.min(MAX_FILTER_CENTS, Math.max(0, Math.round(value)));

/**
 * Validates raw model JSON into filters the catalogue query accepts.
 * Throws when the JSON doesn't fit the schema at all — the caller falls back.
 */
export function sanitizeFilters(raw: unknown, departments: Department[]): ShopFilters {
  const parsed = conciergeFilters.parse(raw);
  const department = parsed.department
    ? matchDepartment(parsed.department, departments)
    : undefined;
  let min = parsed.minPriceCents === undefined ? undefined : clampCents(parsed.minPriceCents);
  let max = parsed.maxPriceCents === undefined ? undefined : clampCents(parsed.maxPriceCents);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  return {
    ...(parsed.keywords ? { search: parsed.keywords } : {}),
    ...(department ? { departmentId: department.id } : {}),
    ...(min !== undefined ? { minPriceCents: min } : {}),
    ...(max !== undefined ? { maxPriceCents: max } : {}),
    sort: parsed.sort && isSortKey(parsed.sort) ? parsed.sort : "featured",
  };
}

/* ------------------------------------------------------------------ */
/* The deterministic fallback translator                               */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "someone",
  "who",
  "show",
  "me",
  "find",
  "looking",
  "look",
  "buy",
  "get",
  "with",
  "and",
  "or",
  "in",
  "of",
  "to",
  "please",
  "something",
  "anything",
  "product",
  "products",
  "item",
  "items",
  "gift",
  "gifts",
  "want",
  "need",
  "i",
  "that",
  "this",
  "under",
  "below",
  "over",
  "between",
  "than",
  "less",
  "more",
  "at",
  "least",
  "most",
  "dollars",
  "dollar",
  "usd",
  "bucks",
  "cheapest",
  "priciest",
  "expensive",
  "lowest",
  "highest",
  "price",
]);

const dollarsToCents = (text: string) => Math.round(Number(text) * 100);

/**
 * Reads a sentence the plain way: a department the store has, a price phrase
 * ("under $50", "between $20 and $40"), a sort hint ("cheapest"), and whatever
 * words are left over as the keyword search.
 */
export function fallbackFilters(query: string, departments: Department[]): ShopFilters {
  let text = ` ${query.toLowerCase()} `;
  const filters: ShopFilters = { sort: "featured" };

  const between = /between \$?(\d+(?:\.\d{1,2})?) and \$?(\d+(?:\.\d{1,2})?)/.exec(text);
  if (between) {
    const [whole, low, high] = between;
    filters.minPriceCents = clampCents(dollarsToCents(low ?? "0"));
    filters.maxPriceCents = clampCents(dollarsToCents(high ?? "0"));
    text = text.replace(whole, " ");
  } else {
    const max =
      /(?:under|below|less than|at most|up to|no more than|max)\s*\$?(\d+(?:\.\d{1,2})?)/.exec(
        text,
      );
    if (max) {
      filters.maxPriceCents = clampCents(dollarsToCents(max[1] ?? "0"));
      text = text.replace(max[0], " ");
    }
    const min = /(?:over|above|more than|at least|min)\s*\$?(\d+(?:\.\d{1,2})?)/.exec(text);
    if (min) {
      filters.minPriceCents = clampCents(dollarsToCents(min[1] ?? "0"));
      text = text.replace(min[0], " ");
    }
  }

  if (/\b(cheapest|lowest price)\b/.test(text)) filters.sort = "price-asc";
  if (/\b(most expensive|priciest|highest price)\b/.test(text)) filters.sort = "price-desc";

  for (const department of departments) {
    const names = [
      department.name.toLowerCase(),
      ...department.name
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((word) => word.length >= 4),
    ];
    if (names.some((name) => text.includes(` ${name} `) || text.includes(name))) {
      filters.departmentId = department.id;
      break;
    }
  }

  const keywords = text
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word))
    .filter(
      (word) =>
        !departments.some((department) =>
          department.name
            .toLowerCase()
            .split(/[^a-z]+/)
            .includes(word),
        ),
    )
    .join(" ")
    .slice(0, 80)
    .trim();
  if (keywords) filters.search = keywords;
  return filters;
}

/* ------------------------------------------------------------------ */

/**
 * Translates one shopper sentence into catalogue filters. Tries the configured LLM
 * first; any failure at all lands on the deterministic translator.
 */
export async function translateQuery(
  env: AiEnv,
  query: string,
  departments: Department[],
  fetchFn: FetchFn = fetch,
): Promise<{ filters: ShopFilters; origin: AiOrigin }> {
  const config = aiConfig(env);
  if (config) {
    try {
      const names = departments.map((department) => department.name).join(", ");
      const raw = await chatJson(
        config,
        [
          {
            role: "system",
            content:
              "You translate a shopper's sentence into catalogue filters for a store. " +
              `Departments: ${names}. ` +
              "Reply with ONLY a JSON object, using only the fields that apply: " +
              '"keywords" (search words), "department" (one of the department names), ' +
              '"minPriceCents" and "maxPriceCents" (whole cents: $50 is 5000), ' +
              `"sort" (one of: ${SORT_KEYS.join(", ")}). No prose, no other fields.`,
          },
          { role: "user", content: query },
        ],
        fetchFn,
      );
      return {
        filters: sanitizeFilters(raw, departments),
        origin: { source: "llm", provider: config.provider, model: config.model },
      };
    } catch {
      // Any provider or validation failure falls through to the plain translator.
    }
  }
  return { filters: fallbackFilters(query, departments), origin: FALLBACK_ORIGIN };
}

/** The filters as short phrases a shopper can read back ("Department: Books"). */
export function describeFilters(filters: ShopFilters, departments: Department[]): string[] {
  const parts: string[] = [];
  const department = departments.find((entry) => entry.id === filters.departmentId);
  if (department) parts.push(`Department: ${department.name}`);
  if (filters.search) parts.push(`Words: “${filters.search}”`);
  if (filters.minPriceCents !== undefined && filters.maxPriceCents !== undefined)
    parts.push(
      `Between ${formatUsd(filters.minPriceCents)} and ${formatUsd(filters.maxPriceCents)}`,
    );
  else if (filters.maxPriceCents !== undefined)
    parts.push(`Under ${formatUsd(filters.maxPriceCents)}`);
  else if (filters.minPriceCents !== undefined)
    parts.push(`Over ${formatUsd(filters.minPriceCents)}`);
  if (filters.sort === "price-asc") parts.push("Sorted by price: low to high");
  if (filters.sort === "price-desc") parts.push("Sorted by price: high to low");
  if (filters.sort === "stock-asc") parts.push("Sorted by stock: lowest first");
  return parts;
}
