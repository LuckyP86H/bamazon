globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { c as string, o as object } from "./schemas_CwnbVb1E.mjs";
import { a as encodeCart, i as decodeCart, n as addToCart, o as setQuantity, r as cartCount, t as CART_COOKIE } from "./cart_GXPUGlpI.mjs";
import { n as db, p as getProduct } from "./runtime_BJ0x1Rmi.mjs";
import { n as notice, r as safeBack, t as failure } from "./http_Bf-GMA0N.mjs";
import { c as readForm, s as quantityField } from "./validation_-1CInUT3.mjs";
// src/pages/api/cart.ts
var cart_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var body = object({
	productId: string().trim().min(1).max(30),
	quantity: quantityField.default(0)
});
var POST = async ({ request, cookies, url, redirect }) => {
	const form = await request.formData();
	const back = safeBack(form.get("back"), "/cart");
	const intent = String(form.get("intent") ?? "");
	const cookieOptions = {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: url.protocol === "https:",
		maxAge: 2592e3
	};
	let items = decodeCart(cookies.get(CART_COOKIE)?.value);
	let message = null;
	if (intent === "clear") {
		items = {};
		message = "Your cart is empty.";
	} else {
		const parsed = readForm(body, form);
		if (!parsed.ok) return redirect(failure(back, parsed.message), 303);
		const { productId, quantity } = parsed.data;
		if (intent === "remove") {
			items = setQuantity(items, productId, 0);
			message = "Removed from your cart.";
		} else if (intent === "set") {
			items = setQuantity(items, productId, quantity);
			message = quantity === 0 ? "Removed from your cart." : "Cart updated.";
		} else if (intent === "add") {
			const product = await getProduct(db(), productId);
			if (!product || !product.active) return redirect(failure(back, "That product is no longer sold."), 303);
			if (product.stock <= 0) return redirect(failure(back, `${product.name} is sold out.`), 303);
			if (quantity < 1) return redirect(failure(back, "Choose at least one."), 303);
			const wanted = addToCart(items, productId, quantity);
			const capped = Math.min(wanted[productId] ?? 0, product.stock);
			items = {
				...wanted,
				[productId]: capped
			};
			message = capped < (wanted[productId] ?? 0) ? `Added. Only ${product.stock} of ${product.name} are in stock, so that's the most we could add.` : `Added ${product.name} to your cart.`;
		} else return redirect(failure(back, "Unknown cart action."), 303);
	}
	if (cartCount(items) === 0) cookies.delete(CART_COOKIE, { path: "/" });
	else cookies.set(CART_COOKIE, encodeCart(items), cookieOptions);
	return redirect(notice(back, message ?? "Cart updated."), 303);
};
// \0virtual:astro:page:src/pages/api/cart@_@ts
var page = () => cart_exports;
export { page };

//# sourceMappingURL=cart_BgdlNqIP.mjs.map