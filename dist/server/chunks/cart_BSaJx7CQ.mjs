globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, p as addAttribute, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { i as decodeCart, t as CART_COOKIE } from "./cart_GXPUGlpI.mjs";
import { n as priceCart, r as toPriced, t as overStock } from "./cart-lines_CfoHlYEg.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { b as productsByIds, n as db } from "./runtime_BJ0x1Rmi.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/pages/cart.astro
var cart_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Cart,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Cart = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Cart;
	const database = db();
	const items = decodeCart(Astro.cookies.get(CART_COOKIE)?.value);
	const [products, staff] = await Promise.all([productsByIds(database, Object.keys(items)).then((rows) => rows.map(toPriced)), currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value)]);
	const cart = priceCart(items, products);
	const short = overStock(cart);
	const canCheckout = cart.lines.length > 0 && short.length === 0;
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Your cart",
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<h1>Your cart</h1>${cart.lines.length === 0 ? renderTemplate`<p class="empty">Your cart is empty. <a href="/">Find something you like</a>.</p>` : renderTemplate`<div class="cols"><ul class="lines" aria-label="Items in your cart">${cart.lines.map((line) => renderTemplate`<li class="line"><span class="thumb" aria-hidden="true">${line.product.emoji}</span><div class="meta"><a${addAttribute(`/products/${encodeURIComponent(line.product.id)}`, "href")}><strong>${line.product.name}</strong></a><span class="muted">${formatUsd(line.product.priceCents)} each · ${formatUsd(line.lineCents)}</span>${line.quantity > line.product.stock && renderTemplate`<span class="stock low">Only ${line.product.stock} left. Lower the quantity to check out.</span>`}</div><div class="actions"><form method="post" action="/api/cart" class="inline"><input type="hidden" name="intent" value="set"><input type="hidden" name="productId"${addAttribute(line.product.id, "value")}><input type="hidden" name="back" value="/cart"><label class="sr-only"${addAttribute(`qty-${line.product.id}`, "for")}>Quantity for ${line.product.name}</label><input${addAttribute(`qty-${line.product.id}`, "id")} type="number" name="quantity" min="0" max="99"${addAttribute(String(line.quantity), "value")}><button type="submit" class="ghost">Update</button></form><form method="post" action="/api/cart"><input type="hidden" name="intent" value="remove"><input type="hidden" name="productId"${addAttribute(line.product.id, "value")}><input type="hidden" name="back" value="/cart"><button type="submit" class="danger">Remove</button></form></div></li>`)}</ul><aside class="panel summary" aria-labelledby="summary-title"><h2 id="summary-title">Order summary</h2><dl><dt>Items</dt><dd>${cart.lines.reduce((sum, line) => sum + line.quantity, 0)}</dd><dt class="total">Total</dt><dd class="total">${formatUsd(cart.totalCents)}</dd></dl>${cart.unavailable.length > 0 && renderTemplate`<p class="note">Some items are no longer available and are not included.</p>`}${canCheckout ? renderTemplate`<a class="button" href="/checkout">Checkout</a>` : renderTemplate`<button type="button" disabled>Checkout</button>`}<form method="post" action="/api/cart" style="margin-top: 12px;"><input type="hidden" name="intent" value="clear"><input type="hidden" name="back" value="/cart"><button type="submit" class="ghost">Empty cart</button></form></aside></div>`}` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/cart.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/cart.astro";
var $$url = "/cart";
// \0virtual:astro:page:src/pages/cart@_@astro
var page = () => cart_exports;
export { page };

//# sourceMappingURL=cart_BSaJx7CQ.mjs.map