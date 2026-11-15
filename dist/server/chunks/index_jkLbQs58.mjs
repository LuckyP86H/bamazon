globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, i as Fragment, p as addAttribute, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { t as $$ProductCard } from "./ProductCard_BROKK60l.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { d as getFeaturedProduct, g as listProducts, h as listDepartments, m as isSortKey, n as db } from "./runtime_BJ0x1Rmi.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
createAstro("https://astro.build");
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	const database = db();
	const q = Astro.url.searchParams.get("q") ?? "";
	const sortParam = Astro.url.searchParams.get("sort") ?? "featured";
	const sort = isSortKey(sortParam) ? sortParam : "featured";
	const deptParam = Number(Astro.url.searchParams.get("dept"));
	const departmentId = Number.isInteger(deptParam) && deptParam > 0 ? deptParam : void 0;
	const [products, departments, staff, featured] = await Promise.all([
		listProducts(database, {
			search: q,
			departmentId,
			sort
		}),
		listDepartments(database),
		currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value),
		getFeaturedProduct(database)
	]);
	const allHref = (extra) => {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		if (sort !== "featured") params.set("sort", sort);
		for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
		else params.delete(key);
		const text = params.toString();
		return text ? `/?${text}` : "/";
	};
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Shop",
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<section class="hero" aria-labelledby="hero-title"><h1 id="hero-title">Everything you were looking for, in one cart.</h1><p>Electronics, books, clothing, kitchen and sports. Prices are final and stock is live.</p></section>${featured && renderTemplate`<section class="panel" aria-labelledby="deal-title" style="margin-bottom: 20px;"><p class="dept">Deal of the day</p><h2 id="deal-title">${featured.emoji} ${featured.name} — ${formatUsd(featured.price_cents)}</h2><p>${featured.description}</p><p><a${addAttribute(`/products/${encodeURIComponent(featured.id)}`, "href")}>See the deal</a></p></section>`}<form method="get" action="/concierge" class="panel" role="search" style="margin-bottom: 20px;"><div class="field"><label for="ask">Or describe what you're looking for</label><input id="ask" name="ask" type="text" maxlength="200" placeholder="a gift under $50 for someone who hikes" autocomplete="off"></div><div style="margin-top: 12px;"><button type="submit" class="ghost">Ask the concierge</button></div></form><nav class="chips" aria-label="Departments"><a class="chip"${addAttribute(allHref({ dept: void 0 }), "href")}${addAttribute(departmentId === void 0 ? "true" : void 0, "aria-current")}>All</a>${departments.map((department) => renderTemplate`<a class="chip"${addAttribute(allHref({ dept: String(department.id) }), "href")}${addAttribute(departmentId === department.id ? "true" : void 0, "aria-current")}>${department.name}</a>`)}</nav><div class="toolbar"><p class="muted" aria-live="polite">${products.length} ${products.length === 1 ? "product" : "products"}${q && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` matching “${q}”` })}`}</p><form method="get" action="/" class="inline">${q && renderTemplate`<input type="hidden" name="q"${addAttribute(q, "value")}>`}${departmentId && renderTemplate`<input type="hidden" name="dept"${addAttribute(String(departmentId), "value")}>`}<label for="sort" class="sr-only">Sort by</label><select id="sort" name="sort"><option value="featured"${addAttribute(sort === "featured", "selected")}>Featured</option><option value="price-asc"${addAttribute(sort === "price-asc", "selected")}>Price: low to high</option><option value="price-desc"${addAttribute(sort === "price-desc", "selected")}>Price: high to low</option><option value="stock-asc"${addAttribute(sort === "stock-asc", "selected")}>Stock: lowest first</option></select><button type="submit" class="ghost">Sort</button></form></div>${products.length === 0 ? renderTemplate`<p class="empty">No products match. Try another search or <a href="/">clear the filters</a>.</p>` : renderTemplate`<ul class="grid">${products.map((product) => renderTemplate`<li>${renderComponent($$result, "ProductCard", $$ProductCard, { "product": product })}</li>`)}</ul>`}` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/index.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/index.astro";
// \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
export { page };

//# sourceMappingURL=index_jkLbQs58.mjs.map