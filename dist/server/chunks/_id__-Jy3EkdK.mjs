globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { f as getOrder, n as db } from "./runtime_BJ0x1Rmi.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/pages/orders/[id].astro
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
	const found = await getOrder(database, Astro.params.id ?? "");
	if (!found) return new Response("Not found", { status: 404 });
	const staff = await currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value);
	const { order, items } = found;
	const placed = new Date(order.created_at).toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC"
	});
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": `Order ${order.id}`,
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<article class="panel receipt" aria-labelledby="receipt-title"><p class="dept">Receipt · order ${order.id}</p><h1 id="receipt-title">Thanks, ${order.customer_name.split(" ")[0]}. Your order is in.</h1><p class="muted">Placed ${placed} UTC · a copy goes to ${order.customer_email}</p><table><thead><tr><th scope="col">Item</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Price</th></tr></thead><tbody>${items.map((item) => renderTemplate`<tr><td>${item.name}</td><td class="num">${item.quantity}</td><td class="num">${formatUsd(item.unit_price_cents * item.quantity)}</td></tr>`)}</tbody><tfoot><tr><th scope="row" colspan="2">Total</th><td class="num"><strong>${formatUsd(order.total_cents)}</strong></td></tr></tfoot></table><p style="margin-top: 20px;"><a class="button" href="/">Keep shopping</a></p></article>` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/orders/[id].astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/orders/[id].astro";
var $$url = "/orders/[id]";
// \0virtual:astro:page:src/pages/orders/[id]@_@astro
var page = () => _id__exports;
export { page };

//# sourceMappingURL=_id__-Jy3EkdK.mjs.map