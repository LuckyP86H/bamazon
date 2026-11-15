globalThis.process ??= {};
globalThis.process.env ??= {};
// src/lib/money.ts
/** Money is stored as whole cents. These helpers are the only place cents become text or back. */
var usd = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD"
});
var formatUsd = (cents) => usd.format(cents / 100);
var DOLLARS = /^(\d{1,7})(?:\.(\d{1,2}))?$/;
/** "12.5" → 1250, "3" → 300. Anything that isn't a plain positive amount returns null. */
function parseDollarsToCents(input) {
	const match = DOLLARS.exec(input.trim());
	if (!match) return null;
	const [, whole = "0", fraction = ""] = match;
	return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export { parseDollarsToCents as n, formatUsd as t };

//# sourceMappingURL=money_SSkbaoHL.mjs.map