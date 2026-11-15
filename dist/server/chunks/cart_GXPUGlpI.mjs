globalThis.process ??= {};
globalThis.process.env ??= {};
import { a as number, c as string, s as record } from "./schemas_CwnbVb1E.mjs";
var CART_COOKIE = "bamazon_cart";
var cartSchema = record(string().min(1).max(30), number().int().min(1).max(99)).refine((items) => Object.keys(items).length <= 40);
var toBase64Url = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
var fromBase64Url = (value) => {
	const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
	const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
};
function encodeCart(items) {
	return toBase64Url(JSON.stringify(items));
}
/** Anything unreadable or out of range is treated as an empty cart rather than an error. */
function decodeCart(value) {
	if (!value) return {};
	try {
		const parsed = cartSchema.safeParse(JSON.parse(fromBase64Url(value)));
		return parsed.success ? parsed.data : {};
	} catch {
		return {};
	}
}
function addToCart(items, productId, quantity) {
	const current = items[productId] ?? 0;
	const next = Math.min(99, current + quantity);
	return {
		...items,
		[productId]: next
	};
}
/** Setting a quantity to zero removes the line. */
function setQuantity(items, productId, quantity) {
	if (quantity <= 0) {
		const { [productId]: _removed, ...rest } = items;
		return rest;
	}
	return {
		...items,
		[productId]: Math.min(99, quantity)
	};
}
function cartCount(items) {
	return Object.values(items).reduce((sum, quantity) => sum + quantity, 0);
}
export { encodeCart as a, decodeCart as i, addToCart as n, setQuantity as o, cartCount as r, CART_COOKIE as t };

//# sourceMappingURL=cart_GXPUGlpI.mjs.map