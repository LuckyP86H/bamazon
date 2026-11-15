globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, p as addAttribute, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { _ as lowStock, c as departmentSummary, g as listProducts, h as listDepartments, n as db } from "./runtime_BJ0x1Rmi.mjs";
import { n as stockStatus } from "./stock_Ciufyotm.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/pages/manage/index.astro
var manage_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	const database = db();
	const staff = await currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value);
	if (!staff) return Astro.redirect("/login");
	const [products, low, departments, summary] = await Promise.all([
		listProducts(database, {
			includeInactive: true,
			sort: "stock-asc"
		}),
		lowStock(database, 5),
		listDepartments(database),
		departmentSummary(database)
	]);
	const salesCents = summary.reduce((sum, row) => sum + row.sales_cents, 0);
	const unitsOnShelf = products.reduce((sum, product) => sum + product.stock, 0);
	const draft = {
		name: Astro.url.searchParams.get("dname") ?? "",
		description: Astro.url.searchParams.get("ddesc") ?? "",
		emoji: Astro.url.searchParams.get("demoji") ?? "",
		departmentId: Number(Astro.url.searchParams.get("ddept")) || void 0,
		source: Astro.url.searchParams.get("dsrc"),
		provider: Astro.url.searchParams.get("dprov")
	};
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Back office",
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<p class="dept">Back office · managers</p><h1>Inventory</h1><p class="muted"><a href="/manage/merchandising">Merchandising — restock urgency, deal of the day, order drafts</a>· <a href="/manage/departments">Department sales</a></p><p class="muted">Signed in as ${staff}.<form method="post" action="/logout" class="inline" style="display: inline;"><button type="submit" class="ghost">Sign out</button></form></p><dl class="stat-row"><div class="stat"><dt>Products</dt><dd>${products.length}</dd></div><div class="stat"><dt>Units on shelf</dt><dd>${unitsOnShelf}</dd></div><div class="stat"><dt>Low stock</dt><dd>${low.length}</dd></div><div class="stat"><dt>Lifetime sales</dt><dd>${formatUsd(salesCents)}</dd></div></dl>${low.length > 0 && renderTemplate`<section class="panel" aria-labelledby="low-title" style="margin-bottom: 20px;"><h2 id="low-title">Low stock (under ${5})</h2><ul>${low.map((product) => renderTemplate`<li>${product.emoji} ${product.name}: <strong>${product.stock}</strong> left</li>`)}</ul></section>`}<div class="scroll"><table aria-label="All products"><thead><tr><th scope="col">Product</th><th scope="col">Department</th><th scope="col" class="num">Price</th><th scope="col" class="num">Stock</th><th scope="col">Restock</th><th scope="col">Listing</th></tr></thead><tbody>${products.map((product) => {
		const status = stockStatus(product.stock);
		return renderTemplate`<tr${addAttribute(status, "data-stock")}><td><span aria-hidden="true">${product.emoji}</span> ${product.name}<br><small class="muted">${product.id}</small></td><td>${product.department}</td><td class="num"><form method="post" action="/api/manage/price" class="inline"><input type="hidden" name="productId"${addAttribute(product.id, "value")}><input type="hidden" name="back" value="/manage"><label class="sr-only"${addAttribute(`price-${product.id}`, "for")}>New price for ${product.name}</label><input${addAttribute(`price-${product.id}`, "id")} name="priceCents" inputmode="decimal"${addAttribute((product.price_cents / 100).toFixed(2), "value")}><button type="submit" class="ghost">Save</button></form></td><td${addAttribute(`num stock ${status}`, "class")}>${product.stock}</td><td><form method="post" action="/api/manage/restock" class="inline"><input type="hidden" name="productId"${addAttribute(product.id, "value")}><input type="hidden" name="back" value="/manage"><label class="sr-only"${addAttribute(`delta-${product.id}`, "for")}>Units to add or remove for ${product.name}</label><input${addAttribute(`delta-${product.id}`, "id")} name="delta" type="number" value="10" step="1"><button type="submit">Update</button></form></td><td><form method="post" action="/api/manage/listing" class="inline"><input type="hidden" name="productId"${addAttribute(product.id, "value")}><input type="hidden" name="active"${addAttribute(product.active ? "0" : "1", "value")}><input type="hidden" name="back" value="/manage"><button type="submit"${addAttribute(product.active ? "ghost" : "", "class")}>${product.active ? "Hide from shop" : "Show in shop"}</button></form></td></tr>`;
	})}</tbody></table></div><section class="panel" aria-labelledby="new-title" style="margin-top: 28px; max-width: 760px;"><h2 id="new-title">Add a product</h2><form method="post" action="/api/manage/draft" class="grid-form" style="margin-bottom: 16px;"><input type="hidden" name="back" value="/manage"><div class="field"><label for="dname">Name (for the draft)</label><input id="dname" name="name" required maxlength="120"${addAttribute(draft.name, "value")}></div><div class="field"><label for="ddept">Department (for the draft)</label><select id="ddept" name="departmentId" required>${departments.map((department) => renderTemplate`<option${addAttribute(String(department.id), "value")}${addAttribute(draft.departmentId === department.id, "selected")}>${department.name}</option>`)}</select></div><div><button type="submit" class="ghost">Draft the description</button></div></form>${draft.source === "llm" && renderTemplate`<p class="flash ok" role="status">Draft by ${draft.provider}. Nothing is saved yet — edit it below, then add the product.</p>`}${draft.source === "fallback" && renderTemplate`<p class="flash" role="status">Template draft — smart drafting isn't switched on for this store, so this is a skeleton, not finished copy. Rewrite it in your own words below, then add the product.</p>`}<form method="post" action="/api/manage/product" class="grid-form"><input type="hidden" name="back" value="/manage"><div class="field"><label for="sku">SKU</label><input id="sku" name="id" required maxlength="30" placeholder="BOO NEW01"></div><div class="field"><label for="pname">Name</label><input id="pname" name="name" required maxlength="120"${addAttribute(draft.name, "value")}></div><div class="field wide"><label for="pdesc">Description</label><input id="pdesc" name="description" maxlength="1000"${addAttribute(draft.description, "value")}></div><div class="field"><label for="emoji">Emoji</label><input id="emoji" name="emoji"${addAttribute(draft.emoji || "📦", "value")} maxlength="8"></div><div class="field"><label for="dept">Department</label><select id="dept" name="departmentId" required>${departments.map((department) => renderTemplate`<option${addAttribute(String(department.id), "value")}${addAttribute(draft.departmentId === department.id, "selected")}>${department.name}</option>`)}</select></div><div class="field"><label for="price">Price (USD)</label><input id="price" name="priceCents" inputmode="decimal" required placeholder="12.50"></div><div class="field"><label for="stock">Opening stock</label><input id="stock" name="stock" type="number" min="0" value="10" required></div><div><button type="submit">Add product</button></div></form></section>` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/manage/index.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/manage/index.astro";
var $$url = "/manage";
// \0virtual:astro:page:src/pages/manage/index@_@astro
var page = () => manage_exports;
export { page };

//# sourceMappingURL=index_ByPjX3uF.mjs.map