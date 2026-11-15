globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, i as Fragment, p as addAttribute, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { a as number, c as string, o as object } from "./schemas_CwnbVb1E.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { t as $$ProductCard } from "./ProductCard_BROKK60l.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { n as aiConfig, r as chatJson, t as FALLBACK_ORIGIN } from "./ai_C8a7Edwi.mjs";
import { g as listProducts, h as listDepartments, m as isSortKey, n as db, t as bindings } from "./runtime_BJ0x1Rmi.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/lib/concierge.ts
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
/** The most the store will ever charge for one item, in cents. Filters clamp to it. */
var MAX_FILTER_CENTS = 1e7;
/** The shape the model is asked for. Unknown keys are stripped, never passed on. */
var conciergeFilters = object({
	keywords: string().trim().min(1).max(80).optional(),
	department: string().trim().min(1).max(60).optional(),
	minPriceCents: number().finite().optional(),
	maxPriceCents: number().finite().optional(),
	sort: string().optional()
});
var SORT_KEYS = [
	"featured",
	"price-asc",
	"price-desc",
	"stock-asc"
];
/** Matches a model-supplied department name to a real department, or nothing. */
function matchDepartment(name, departments) {
	const wanted = name.trim().toLowerCase();
	return departments.find((department) => department.name.toLowerCase() === wanted) ?? departments.find((department) => department.name.toLowerCase().includes(wanted) || wanted.includes(department.name.toLowerCase()));
}
var clampCents = (value) => Math.min(MAX_FILTER_CENTS, Math.max(0, Math.round(value)));
/**
* Validates raw model JSON into filters the catalogue query accepts.
* Throws when the JSON doesn't fit the schema at all — the caller falls back.
*/
function sanitizeFilters(raw, departments) {
	const parsed = conciergeFilters.parse(raw);
	const department = parsed.department ? matchDepartment(parsed.department, departments) : void 0;
	let min = parsed.minPriceCents === void 0 ? void 0 : clampCents(parsed.minPriceCents);
	let max = parsed.maxPriceCents === void 0 ? void 0 : clampCents(parsed.maxPriceCents);
	if (min !== void 0 && max !== void 0 && min > max) [min, max] = [max, min];
	return {
		...parsed.keywords ? { search: parsed.keywords } : {},
		...department ? { departmentId: department.id } : {},
		...min !== void 0 ? { minPriceCents: min } : {},
		...max !== void 0 ? { maxPriceCents: max } : {},
		sort: parsed.sort && isSortKey(parsed.sort) ? parsed.sort : "featured"
	};
}
var STOPWORDS = /* @__PURE__ */ new Set([
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
	"price"
]);
var dollarsToCents = (text) => Math.round(Number(text) * 100);
/**
* Reads a sentence the plain way: a department the store has, a price phrase
* ("under $50", "between $20 and $40"), a sort hint ("cheapest"), and whatever
* words are left over as the keyword search.
*/
function fallbackFilters(query, departments) {
	let text = ` ${query.toLowerCase()} `;
	const filters = { sort: "featured" };
	const between = /between \$?(\d+(?:\.\d{1,2})?) and \$?(\d+(?:\.\d{1,2})?)/.exec(text);
	if (between) {
		const [whole, low, high] = between;
		filters.minPriceCents = clampCents(dollarsToCents(low ?? "0"));
		filters.maxPriceCents = clampCents(dollarsToCents(high ?? "0"));
		text = text.replace(whole, " ");
	} else {
		const max = /(?:under|below|less than|at most|up to|no more than|max)\s*\$?(\d+(?:\.\d{1,2})?)/.exec(text);
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
	for (const department of departments) if ([department.name.toLowerCase(), ...department.name.toLowerCase().split(/[^a-z]+/).filter((word) => word.length >= 4)].some((name) => text.includes(` ${name} `) || text.includes(name))) {
		filters.departmentId = department.id;
		break;
	}
	const keywords = text.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((word) => word.length >= 2 && !STOPWORDS.has(word)).filter((word) => !departments.some((department) => department.name.toLowerCase().split(/[^a-z]+/).includes(word))).join(" ").slice(0, 80).trim();
	if (keywords) filters.search = keywords;
	return filters;
}
/**
* Translates one shopper sentence into catalogue filters. Tries the configured LLM
* first; any failure at all lands on the deterministic translator.
*/
async function translateQuery(env, query, departments, fetchFn = fetch) {
	const config = aiConfig(env);
	if (config) try {
		const names = departments.map((department) => department.name).join(", ");
		return {
			filters: sanitizeFilters(await chatJson(config, [{
				role: "system",
				content: `You translate a shopper's sentence into catalogue filters for a store. Departments: ${names}. Reply with ONLY a JSON object, using only the fields that apply: "keywords" (search words), "department" (one of the department names), "minPriceCents" and "maxPriceCents" (whole cents: \$50 is 5000), "sort" (one of: ${SORT_KEYS.join(", ")}). No prose, no other fields.`
			}, {
				role: "user",
				content: query
			}], fetchFn), departments),
			origin: {
				source: "llm",
				provider: config.provider,
				model: config.model
			}
		};
	} catch {}
	return {
		filters: fallbackFilters(query, departments),
		origin: FALLBACK_ORIGIN
	};
}
/** The filters as short phrases a shopper can read back ("Department: Books"). */
function describeFilters(filters, departments) {
	const parts = [];
	const department = departments.find((entry) => entry.id === filters.departmentId);
	if (department) parts.push(`Department: ${department.name}`);
	if (filters.search) parts.push(`Words: “${filters.search}”`);
	if (filters.minPriceCents !== void 0 && filters.maxPriceCents !== void 0) parts.push(`Between ${formatUsd(filters.minPriceCents)} and ${formatUsd(filters.maxPriceCents)}`);
	else if (filters.maxPriceCents !== void 0) parts.push(`Under ${formatUsd(filters.maxPriceCents)}`);
	else if (filters.minPriceCents !== void 0) parts.push(`Over ${formatUsd(filters.minPriceCents)}`);
	if (filters.sort === "price-asc") parts.push("Sorted by price: low to high");
	if (filters.sort === "price-desc") parts.push("Sorted by price: high to low");
	if (filters.sort === "stock-asc") parts.push("Sorted by stock: lowest first");
	return parts;
}
// src/pages/concierge.astro
var concierge_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Concierge,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Concierge = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Concierge;
	const database = db();
	const ask = (Astro.url.searchParams.get("ask") ?? "").trim().slice(0, 200);
	const [departments, staff] = await Promise.all([listDepartments(database), currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value)]);
	const translated = ask ? await translateQuery(bindings, ask, departments) : null;
	const products = translated ? await listProducts(database, {
		search: translated.filters.search,
		departmentId: translated.filters.departmentId,
		minPriceCents: translated.filters.minPriceCents,
		maxPriceCents: translated.filters.maxPriceCents,
		sort: translated.filters.sort
	}) : [];
	const filterParts = translated ? describeFilters(translated.filters, departments) : [];
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Concierge",
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<section class="hero" aria-labelledby="concierge-title"><h1 id="concierge-title">Tell us what you're looking for.</h1><p>Plain words work: “a water bottle under $30”, “the cheapest books”, “something for the kitchen over $40”. The concierge turns your sentence into the shop's ordinary filters.</p></section><form method="get" action="/concierge" class="panel" style="max-width: 760px;" role="search"><div class="field"><label for="ask">Describe what you're looking for</label><input id="ask" name="ask" type="text"${addAttribute(ask, "value")} maxlength="200" placeholder="a gift under $50 for someone who hikes" autocomplete="off"></div><div style="margin-top: 12px;"><button type="submit">Ask the concierge</button></div></form>${translated && renderTemplate`<section aria-live="polite" style="margin-top: 24px;"><p class="muted">You asked: “${ask}”${filterParts.length > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${" "}— we read that as: <strong>${filterParts.join(" · ")}</strong>` })}`}</p>${translated.origin.source === "fallback" ? renderTemplate`<p class="flash" role="status">Smart search isn't switched on for this store, so we matched your words the plain way — keywords, departments and prices — instead. The filters above are exactly what ran.</p>` : renderTemplate`<p class="muted">Translated by ${translated.origin.provider} (${translated.origin.model}), checked against the shop's real departments and price range before it ran.</p>`}${products.length === 0 ? renderTemplate`<p class="empty">Nothing matches that. Try fewer words, or <a href="/">browse everything</a>.</p>` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<p class="muted">${products.length} ${products.length === 1 ? "product" : "products"}</p><ul class="grid">${products.map((product) => renderTemplate`<li>${renderComponent($$result, "ProductCard", $$ProductCard, { "product": product })}</li>`)}</ul>` })}`}</section>`}` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/concierge.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/concierge.astro";
var $$url = "/concierge";
// \0virtual:astro:page:src/pages/concierge@_@astro
var page = () => concierge_exports;
export { page };

//# sourceMappingURL=concierge_BagtcnfB.mjs.map