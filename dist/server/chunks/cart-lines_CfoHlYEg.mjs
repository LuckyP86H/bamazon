globalThis.process ??= {};
globalThis.process.env ??= {};
// src/lib/cart-lines.ts
/** A database row (snake_case, 0/1 flags) in the shape pricing works with. */
function toPriced(row) {
	return {
		id: row.id,
		name: row.name,
		emoji: row.emoji,
		priceCents: row.price_cents,
		stock: row.stock,
		active: row.active === 1
	};
}
/** Prices a cart from the current catalogue. Quantities above the live stock are kept but flagged. */
function priceCart(items, products) {
	const byId = new Map(products.map((product) => [product.id, product]));
	const lines = [];
	const unavailable = [];
	for (const [id, quantity] of Object.entries(items)) {
		const product = byId.get(id);
		if (!product || !product.active || product.stock <= 0) {
			unavailable.push(id);
			continue;
		}
		lines.push({
			product,
			quantity,
			lineCents: product.priceCents * quantity
		});
	}
	return {
		lines,
		unavailable,
		totalCents: lines.reduce((sum, line) => sum + line.lineCents, 0)
	};
}
/** Lines that ask for more than is on the shelf right now. */
function overStock(cart) {
	return cart.lines.filter((line) => line.quantity > line.product.stock);
}
export { priceCart as n, toPriced as r, overStock as t };

//# sourceMappingURL=cart-lines_CfoHlYEg.mjs.map