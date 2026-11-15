globalThis.process ??= {};
globalThis.process.env ??= {};
function stockStatus(stock) {
	if (stock <= 0) return "out";
	if (stock < 5) return "low";
	return "in";
}
function stockLabel(stock) {
	const status = stockStatus(stock);
	if (status === "out") return "Out of stock";
	if (status === "low") return `Only ${stock} left`;
	return `${stock} in stock`;
}
export { stockStatus as n, stockLabel as t };

//# sourceMappingURL=stock_Ciufyotm.mjs.map