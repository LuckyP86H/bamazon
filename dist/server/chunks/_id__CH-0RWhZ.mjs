globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, i as Fragment, p as addAttribute, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { n as db, p as getProduct } from "./runtime_BJ0x1Rmi.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
import { n as stockStatus, t as stockLabel } from "./stock_Ciufyotm.mjs";
import "./cart_GXPUGlpI.mjs";
// src/pages/products/[id].astro
var _id__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Id,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Id = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Id;
	const database = db();
	const product = await getProduct(database, Astro.params.id ?? "");
	if (!product || !product.active) return new Response("Not found", { status: 404 });
	const staff = await currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value);
	const status = stockStatus(product.stock);
	const maxBuy = Math.min(99, product.stock);
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": product.name,
		"description": product.description,
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<nav class="muted" aria-label="Breadcrumb"><a href="/">Shop</a> / <a${addAttribute(`/?dept=${product.department_id}`, "href")}>${product.department}</a></nav><section class="detail" style="margin-top: 16px;"><div class="art" aria-hidden="true">${product.emoji}</div><div class="panel"><p class="dept">${product.department}</p><h1>${product.name}</h1><p class="price">${formatUsd(product.price_cents)}</p><p${addAttribute(`stock ${status}`, "class")}>${stockLabel(product.stock)}${status === "low" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · restock soon` })}`}</p><p>${product.description || "No description yet."}</p>${status === "out" ? renderTemplate`<p class="flash bad" role="status">This item is sold out. Check back soon.</p>` : renderTemplate`<form class="buy" method="post" action="/api/cart"><input type="hidden" name="intent" value="add"><input type="hidden" name="productId"${addAttribute(product.id, "value")}><input type="hidden" name="back"${addAttribute(`/products/${encodeURIComponent(product.id)}`, "value")}><label>Quantity<input type="number" name="quantity" value="1" min="1"${addAttribute(String(maxBuy), "max")} required></label><button type="submit">Add to cart</button></form>`}<p class="note">Up to ${maxBuy} per order. Low-stock threshold: under ${5}.</p></div></section>` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/products/[id].astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/products/[id].astro";
var $$url = "/products/[id]";
// \0virtual:astro:page:src/pages/products/[id]@_@astro
var page = () => _id__exports;
export { page };

//# sourceMappingURL=_id__CH-0RWhZ.mjs.map