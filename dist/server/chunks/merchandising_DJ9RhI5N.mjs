globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, i as Fragment, p as addAttribute, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { g as listProducts, n as db, t as bindings, y as productSalesStats } from "./runtime_BJ0x1Rmi.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/lib/judge.ts
var DEFAULT_BASE_URL = "https://api.typesafe.ai";
var DEFAULT_MODEL = "jev-latest";
var TIMEOUT_MS = 1e4;
var TypesafeJev = class {
	kind = "typesafe";
	apiKey;
	baseUrl;
	model;
	fetchFn;
	constructor(opts) {
		this.apiKey = opts.apiKey;
		this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
		this.model = opts.model ?? DEFAULT_MODEL;
		this.fetchFn = opts.fetchFn ?? fetch;
	}
	async evaluate(state, questions) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const response = await this.fetchFn(`${this.baseUrl}/v1/systemone`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${this.apiKey}`,
					"content-type": "application/json"
				},
				body: JSON.stringify({
					model: this.model,
					state,
					questions
				}),
				signal: controller.signal
			});
			if (!response.ok) throw new Error(`typesafe http ${response.status}`);
			const data = await response.json();
			if (!data.answers || typeof data.answers !== "object") throw new Error("typesafe response missing answers");
			const out = {};
			for (const [id, question] of Object.entries(questions)) out[id] = parseAnswer(id, question, data.answers[id]);
			return out;
		} finally {
			clearTimeout(timer);
		}
	}
};
function num(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}
/** Defensive parsing: a malformed answer is an error, never a silent guess. */
function parseAnswer(id, question, raw) {
	if (!raw || typeof raw !== "object") throw new Error(`typesafe answer ${id} missing`);
	const answer = raw;
	if (question.type === "noul") {
		const probability = num(answer.noul);
		if (probability === null) throw new Error(`typesafe answer ${id} missing noul`);
		return {
			type: "noul",
			noul: Math.min(1, Math.max(0, probability))
		};
	}
	const levels = question.criteria.length;
	const score = num(answer.score);
	if (score === null) throw new Error(`typesafe answer ${id} missing score`);
	const rawProbabilities = answer.probabilities ?? {};
	const probabilities = {};
	for (let level = 0; level < levels; level++) probabilities[String(level)] = num(rawProbabilities[String(level)]) ?? 0;
	return {
		type: "score",
		score: Math.min(levels - 1, Math.max(0, score)),
		probabilities,
		confidence: num(answer.confidence) ?? 0
	};
}
/** Reads a 0..1 signal the merchandising module put in the state, or a neutral 0.5. */
function signal(state, key) {
	if (state && typeof state === "object") {
		const value = state[key];
		if (typeof value === "number" && Number.isFinite(value)) return Math.min(1, Math.max(0, value));
	}
	return .5;
}
var DemoJev = class {
	kind = "demo";
	async evaluate(state, questions) {
		const out = {};
		for (const [id, question] of Object.entries(questions)) {
			if (question.type === "noul") {
				out[id] = {
					type: "noul",
					noul: signal(state, "gate")
				};
				continue;
			}
			const levels = question.criteria.length;
			const score = signal(state, "urgency") * (levels - 1);
			const probabilities = {};
			for (let level = 0; level < levels; level++) probabilities[String(level)] = Math.max(.02, 1 - Math.abs(level - score) / levels);
			const total = Object.values(probabilities).reduce((sum, value) => sum + value, 0) || 1;
			for (const key of Object.keys(probabilities)) probabilities[key] = (probabilities[key] ?? 0) / total;
			out[id] = {
				type: "score",
				score,
				probabilities,
				confidence: .6
			};
		}
		return out;
	}
};
/**
* Asks Jev (real when TYPESAFE_API_KEY is set), falling back to the demo judge on
* ANY failure — missing key, HTTP error, malformed response. The returned `judge`
* always names the judge that produced the answers.
*/
async function judgeWithFallback(env, state, questions, fetchFn = fetch) {
	const apiKey = env.TYPESAFE_API_KEY?.trim();
	if (apiKey) try {
		return {
			answers: await new TypesafeJev({
				apiKey,
				fetchFn,
				...env.TYPESAFE_BASE_URL ? { baseUrl: env.TYPESAFE_BASE_URL } : {},
				...env.TYPESAFE_MODEL ? { model: env.TYPESAFE_MODEL } : {}
			}).evaluate(state, questions),
			judge: "typesafe"
		};
	} catch {}
	return {
		answers: await new DemoJev().evaluate(state, questions),
		judge: "demo"
	};
}
// src/lib/merchandising.ts
/**
* The merchandising panel: restock urgency, a deal-of-the-day proposal and a
* purchase-order draft, all judged.
*
* The signals are plain arithmetic over data the store already keeps — stock on
* hand, units sold in the last 30 days, days of cover at that rate, revenue —
* and the reasons shown next to every score are generated from those signals, so
* a manager can always see WHY. The judge (Jev when configured, the labelled
* demo judge otherwise) turns the signals into a calibrated urgency score and
* gates the two proposed actions. The judge never writes anything: featuring a
* deal and applying a restock are manager clicks through the existing handlers.
*/
var clamp01 = (value) => Math.min(1, Math.max(0, value));
/** How much of the urgency comes from the shelf running dry vs. the item selling well. */
function stockPressure(stock, daysOfCover) {
	if (stock === 0) return 1;
	if (daysOfCover === null) return stock < 5 ? .35 : .1;
	if (daysOfCover <= 3) return .95;
	if (daysOfCover <= 7) return .85;
	if (daysOfCover <= 14) return .65;
	if (daysOfCover <= 30) return .4;
	return .15;
}
/** The facts about one product, with the reasons a manager will read. */
function productSignals(product, stats, maxRevenueCents) {
	const unitsRecent = stats?.unitsRecent ?? 0;
	const revenueRecentCents = stats?.revenueRecentCents ?? 0;
	const daysOfCover = unitsRecent > 0 ? product.stock / (unitsRecent / 30) : null;
	const sellerStrength = maxRevenueCents > 0 ? revenueRecentCents / maxRevenueCents : 0;
	const urgency = clamp01(.75 * stockPressure(product.stock, daysOfCover) + .25 * sellerStrength);
	const reasons = [];
	if (product.stock === 0) reasons.push("Out of stock");
	else if (product.stock < 5) reasons.push(`Only ${product.stock} left on the shelf`);
	if (unitsRecent > 0) {
		reasons.push(`Sold ${unitsRecent} in the last 30 days`);
		if (daysOfCover !== null && daysOfCover <= 30) reasons.push(`About ${Math.max(1, Math.ceil(daysOfCover))} days of cover at that rate`);
	} else reasons.push("No sales in the last 30 days");
	if (sellerStrength >= .5 && revenueRecentCents > 0) reasons.push("One of the strongest sellers by revenue this month");
	return {
		product,
		unitsRecent,
		revenueRecentCents,
		daysOfCover,
		urgency,
		reasons: reasons.slice(0, 3)
	};
}
/**
* The restock rule, stated plainly so a manager can sanity-check the draft:
* cover the next 30 days at the recent sales rate, with a floor of 10 units,
* minus what's already on the shelf.
*/
function suggestedRestockQuantity(signals) {
	const target = Math.max(Math.ceil(signals.unitsRecent), 10);
	return Math.max(0, target - signals.product.stock);
}
var URGENCY_QUESTION = {
	type: "score",
	instructions: "Rate how urgently this product needs a restock, from its stock, recent sales and days of cover.",
	criteria: [
		"plenty of cover — no action needed",
		"healthy — selling at a pace the shelf can sustain",
		"watch — cover is thinning",
		"urgent — likely to run out within two weeks at the recent rate",
		"critical — out of stock, or days from it"
	]
};
var stateFor = (signals) => ({
	product: signals.product.name,
	department: signals.product.department,
	stock: signals.product.stock,
	unitsSoldLast30Days: signals.unitsRecent,
	daysOfCover: signals.daysOfCover === null ? "no recent sales" : Math.ceil(signals.daysOfCover),
	lifetimeSales: formatUsd(signals.product.product_sales_cents),
	urgency: signals.urgency
});
/** Builds the whole panel. Products are judged one at a time; the catalogue is small. */
async function buildPanel(db, env, fetchFn = fetch) {
	const [products, stats] = await Promise.all([listProducts(db, { includeInactive: true }), productSalesStats(db)]);
	const active = products.filter((product) => product.active === 1);
	const maxRevenue = Math.max(0, ...active.map((p) => stats.get(p.id)?.revenueRecentCents ?? 0));
	const kinds = [];
	const scored = [];
	for (const product of active) {
		const signals = productSignals(product, stats.get(product.id), maxRevenue);
		const { answers, judge } = await judgeWithFallback(env, stateFor(signals), { urgency: URGENCY_QUESTION }, fetchFn);
		kinds.push(judge);
		const answer = answers.urgency;
		const level = answer?.type === "score" ? answer.score : signals.urgency * (URGENCY_QUESTION.criteria.length - 1);
		const confidence = answer?.type === "score" ? answer.confidence : 0;
		scored.push({
			signals,
			score: Math.round(level / (URGENCY_QUESTION.criteria.length - 1) * 100),
			confidence
		});
	}
	scored.sort((a, b) => b.score - a.score || a.signals.product.name.localeCompare(b.signals.product.name));
	const currentDeal = active.find((product) => product.featured === 1) ?? null;
	const gate = async (entry, gateValue, question) => {
		const { answers, judge } = await judgeWithFallback(env, {
			...stateFor(entry.signals),
			gate: gateValue
		}, { gate: question }, fetchFn);
		kinds.push(judge);
		const answer = answers.gate;
		const probability = answer?.type === "noul" ? answer.noul : gateValue;
		return {
			product: entry.signals.product,
			approved: probability >= .5,
			probability
		};
	};
	const dealEntry = scored.find((entry) => entry.signals.product.stock >= 3 && entry.signals.product.id !== currentDeal?.id);
	const deal = dealEntry ? {
		...await gate(dealEntry, dealEntry.score / 100, {
			type: "noul",
			instructions: "This product should be featured as today's deal of the day.",
			criteria: {
				true: "It is selling, it has stock to sell, and featuring it is likely to move units today.",
				false: "Featuring it would waste the slot — too little stock, or too little demand."
			}
		}),
		score: dealEntry.score
	} : null;
	const top = scored[0];
	const quantity = top ? suggestedRestockQuantity(top.signals) : 0;
	const purchaseOrder = top && quantity > 0 ? {
		...await gate(top, top.signals.product.stock === 0 ? .9 : top.signals.daysOfCover === null ? .3 : top.signals.daysOfCover <= 14 ? .9 : top.signals.daysOfCover <= 30 ? .55 : .2, {
			type: "noul",
			instructions: "This restock should be ordered now, at the drafted quantity.",
			criteria: {
				true: "Cover is short enough that waiting risks a stockout.",
				false: "The shelf can wait — cover is adequate or demand is unproven."
			}
		}),
		quantity
	} : null;
	return {
		judge: kinds.length > 0 && kinds.every((kind) => kind === "typesafe") ? "typesafe" : "demo",
		scored,
		currentDeal,
		deal,
		purchaseOrder
	};
}
// src/pages/manage/merchandising.astro
var merchandising_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Merchandising,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Merchandising = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Merchandising;
	const database = db();
	const staff = await currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value);
	if (!staff) return Astro.redirect("/login");
	const panel = await buildPanel(database, bindings);
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Merchandising",
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<p class="dept">Back office · merchandising</p><h1>Restock urgency &amp; today's calls</h1><p class="muted"><a href="/manage">Back to inventory</a></p>${panel.judge === "demo" ? renderTemplate`<p class="flash" role="status"><strong>Demo judge.</strong> Jev isn't configured for this store, so these scores and gates come from a deterministic stand-in doing plain arithmetic on the same signals — not from a judgment model. Set TYPESAFE_API_KEY to hand the judging to Jev.</p>` : renderTemplate`<p class="flash ok" role="status">Judged by Jev (TypeSafe). Scores are calibrated judgments over the signals listed in the reasons column.</p>`}<div class="scroll" tabindex="0"><table aria-label="Products by restock urgency"><thead><tr><th scope="col">Product</th><th scope="col" class="num">Stock</th><th scope="col" class="num">Sold (30 days)</th><th scope="col" class="num">Urgency</th><th scope="col">Why</th></tr></thead><tbody>${panel.scored.map(({ signals, score }) => renderTemplate`<tr><td><span aria-hidden="true">${signals.product.emoji}</span> ${signals.product.name}<br><small class="muted">${signals.product.department}</small></td><td class="num">${signals.product.stock}</td><td class="num">${signals.unitsRecent}</td><td class="num"><strong>${score}</strong><meter min="0" max="100"${addAttribute(score, "value")}>${score} out of 100</meter></td><td>${signals.reasons.join(". ")}</td></tr>`)}</tbody></table></div><section class="panel" aria-labelledby="deal-title" style="margin-top: 28px; max-width: 760px;"><h2 id="deal-title">Deal of the day</h2>${panel.currentDeal && renderTemplate`<p>Currently featuring: <strong>${panel.currentDeal.emoji} ${panel.currentDeal.name}</strong>${" "}(${formatUsd(panel.currentDeal.price_cents)})</p>`}${panel.deal ? panel.deal.approved ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<p>The judge proposes <strong>${panel.deal.product.emoji} ${panel.deal.product.name}</strong>${" "}(urgency ${panel.deal.score}, ${Math.round(panel.deal.probability * 100)}% in favour). Featuring is your click — the judge never changes the shop on its own.</p><form method="post" action="/api/manage/feature" class="inline"><input type="hidden" name="productId"${addAttribute(panel.deal.product.id, "value")}><input type="hidden" name="back" value="/manage/merchandising"><button type="submit">Feature it as the deal of the day</button></form>` })}` : renderTemplate`<p class="muted">The judge looked at ${panel.deal.product.name} and voted no (${Math.round(panel.deal.probability * 100)}% in favour) — not enough stock or demand to be worth the slot today.</p>` : renderTemplate`<p class="muted">No product with enough stock to feature right now.</p>`}</section><section class="panel" aria-labelledby="po-title" style="margin-top: 28px; max-width: 760px;"><h2 id="po-title">Purchase-order draft</h2>${panel.purchaseOrder ? panel.purchaseOrder.approved ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<p>Order <strong>${panel.purchaseOrder.quantity} × ${panel.purchaseOrder.product.name}</strong>. The draft follows the stated rule: cover the next 30 days at the recent sales rate, with a floor of 10 units, minus what's on the shelf. The judge is${" "}${Math.round(panel.purchaseOrder.probability * 100)}% in favour. Approving applies it through the ordinary restock, so stock and history stay consistent.</p><form method="post" action="/api/manage/restock" class="inline"><input type="hidden" name="productId"${addAttribute(panel.purchaseOrder.product.id, "value")}><input type="hidden" name="delta"${addAttribute(String(panel.purchaseOrder.quantity), "value")}><input type="hidden" name="back" value="/manage/merchandising"><button type="submit">Approve and restock</button></form>` })}` : renderTemplate`<p class="muted">The draft for ${panel.purchaseOrder.product.name} (+${panel.purchaseOrder.quantity}) is on hold — the judge is only ${Math.round(panel.purchaseOrder.probability * 100)}% in favour, so no approval button. You can still restock it by hand from the inventory page.</p>` : renderTemplate`<p class="muted">Nothing needs ordering right now.</p>`}</section>` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/manage/merchandising.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/manage/merchandising.astro";
var $$url = "/manage/merchandising";
// \0virtual:astro:page:src/pages/manage/merchandising@_@astro
var page = () => merchandising_exports;
export { page };

//# sourceMappingURL=merchandising_DJ9RhI5N.mjs.map