globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { i as decodeCart, t as CART_COOKIE } from "./cart_GXPUGlpI.mjs";
import { n as priceCart, r as toPriced } from "./cart-lines_CfoHlYEg.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { b as productsByIds, n as db } from "./runtime_BJ0x1Rmi.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/pages/checkout.astro
var checkout_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Checkout,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Checkout = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Checkout;
	const database = db();
	const items = decodeCart(Astro.cookies.get(CART_COOKIE)?.value);
	const [products, staff] = await Promise.all([productsByIds(database, Object.keys(items)).then((rows) => rows.map(toPriced)), currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value)]);
	const cart = priceCart(items, products);
	if (cart.lines.length === 0) return Astro.redirect("/cart");
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Checkout",
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<h1>Checkout</h1><div class="cols"><form class="panel" method="post" action="/api/checkout"><h2>Your details</h2><p class="note" style="margin: 6px 0 16px;">We use these only to show your receipt. Nothing is charged.</p><div class="field"><label for="name">Full name</label><input id="name" name="name" type="text" autocomplete="name" required maxlength="80"></div><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254"></div><button type="submit">Place order · ${formatUsd(cart.totalCents)}</button></form><aside class="panel summary" aria-labelledby="review-title"><h2 id="review-title">Review</h2><ul class="lines" style="margin: 12px 0;">${cart.lines.map((line) => renderTemplate`<li class="line" style="grid-template-columns: 40px 1fr auto;"><span class="thumb" aria-hidden="true">${line.product.emoji}</span><span>${line.product.name} × ${line.quantity}</span><span>${formatUsd(line.lineCents)}</span></li>`)}</ul><dl><dt class="total">Total</dt><dd class="total">${formatUsd(cart.totalCents)}</dd></dl></aside></div>` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/checkout.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/checkout.astro";
var $$url = "/checkout";
// \0virtual:astro:page:src/pages/checkout@_@astro
var page = () => checkout_exports;
export { page };

//# sourceMappingURL=checkout_ChJSIpVS.mjs.map