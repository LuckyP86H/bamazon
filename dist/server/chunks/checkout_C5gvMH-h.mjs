globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { i as decodeCart, t as CART_COOKIE } from "./cart_GXPUGlpI.mjs";
import { n as priceCart, r as toPriced, t as overStock } from "./cart-lines_CfoHlYEg.mjs";
import { b as productsByIds, n as db, v as placeOrder } from "./runtime_BJ0x1Rmi.mjs";
import { t as failure } from "./http_Bf-GMA0N.mjs";
import { c as readForm, t as checkoutForm } from "./validation_-1CInUT3.mjs";
// src/lib/checkout.ts
var ORDER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
var ORDER_ID_ATTEMPTS = 3;
function newOrderId() {
	return [...crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(10))].map((byte) => ORDER_ALPHABET[byte % 32]).join("");
}
/**
* Turns a cart into an order. Prices and stock come from the database, never from the cookie.
* Stock is re-checked inside the atomic batch, so a concurrent sale can't oversell.
*/
async function checkout(db, items, customer, orderId) {
	if (Object.keys(items).length === 0) return {
		ok: false,
		message: "Your cart is empty."
	};
	const products = (await productsByIds(db, Object.keys(items))).map(toPriced);
	const cart = priceCart(items, products);
	if (cart.lines.length === 0) return {
		ok: false,
		message: "None of the items in your cart are available any more."
	};
	const short = overStock(cart);
	if (short.length > 0) {
		const first = short[0];
		return {
			ok: false,
			message: `Only ${first?.product.stock} of "${first?.product.name}" left. Please lower the quantity.`
		};
	}
	const lines = cart.lines.map((line) => ({
		productId: line.product.id,
		name: line.product.name,
		unitPriceCents: line.product.priceCents,
		quantity: line.quantity
	}));
	let id = orderId;
	for (let attempt = 1;; attempt++) try {
		await placeOrder(db, {
			id,
			customerName: customer.name,
			customerEmail: customer.email,
			lines,
			totalCents: cart.totalCents
		});
		return {
			ok: true,
			orderId: id,
			totalCents: cart.totalCents
		};
	} catch (error) {
		if (String(error).includes("CHECK constraint")) return {
			ok: false,
			message: "Stock changed while you were checking out. Please review your cart."
		};
		if (!String(error).includes("UNIQUE constraint")) throw error;
		if (attempt >= ORDER_ID_ATTEMPTS) return {
			ok: false,
			message: "Something went wrong placing your order. Please try again."
		};
		id = newOrderId();
	}
}
// src/pages/api/checkout.ts
var checkout_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const parsed = readForm(checkoutForm, form);
	if (!parsed.ok) return redirect(failure("/checkout", parsed.message), 303);
	const items = decodeCart(cookies.get(CART_COOKIE)?.value);
	const result = await checkout(db(), items, parsed.data, newOrderId());
	if (!result.ok) return redirect(failure("/checkout", result.message), 303);
	cookies.delete(CART_COOKIE, { path: "/" });
	return redirect(`/orders/${result.orderId}`, 303);
};
// \0virtual:astro:page:src/pages/api/checkout@_@ts
var page = () => checkout_exports;
export { page };

//# sourceMappingURL=checkout_C5gvMH-h.mjs.map