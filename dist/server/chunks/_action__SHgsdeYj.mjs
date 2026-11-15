globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { c as string, n as _enum, o as object } from "./schemas_CwnbVb1E.mjs";
import { a as currentStaff } from "./auth_CX-A95a0.mjs";
import { C as setPrice, S as setOverhead, a as adjustStock, h as listDepartments, i as addProduct, l as featureProduct, n as db, r as addDepartment, t as bindings, x as setActive } from "./runtime_BJ0x1Rmi.mjs";
import { n as aiConfig, r as chatJson, t as FALLBACK_ORIGIN } from "./ai_C8a7Edwi.mjs";
import { i as withParams, n as notice, r as safeBack, t as failure } from "./http_Bf-GMA0N.mjs";
import { a as overheadForm, c as readForm, i as newProductForm, l as restockForm, n as departmentForm, o as priceForm, r as draftForm } from "./validation_-1CInUT3.mjs";
// src/lib/drafts.ts
/**
* Product-description drafts for the back office.
*
* A manager types a name and picks a department; this module drafts the description
* (and an emoji) for the add-product form. The draft is text in a form field —
* nothing is saved until the manager edits it and submits the usual product form,
* which validates everything exactly as before.
*
* With an LLM configured, the model writes the draft. Without one — or on any
* provider failure — a plain template draft answers instead, and the origin says
* which happened so the UI can label it.
*/
var draftShape = object({
	description: string().trim().min(1).max(1e3),
	emoji: string().trim().min(1).max(8)
});
var EMOJI_BY_DEPARTMENT = [
	[/electronic/i, "🔌"],
	[/book/i, "📚"],
	[/cloth|apparel/i, "👕"],
	[/kitchen|home/i, "🍳"],
	[/sport|outdoor/i, "🏅"]
];
/** The template draft's emoji: a fixed pick from the department name. */
function templateEmoji(department) {
	return EMOJI_BY_DEPARTMENT.find(([pattern]) => pattern.test(department))?.[1] ?? "📦";
}
/**
* The deterministic draft. It reads like what it is — a skeleton for the manager
* to rewrite — and the back office labels it as a template when it appears.
*/
function templateDraft(name, department) {
	return {
		description: `${name} — new to our ${department} department. Say what it is, who it is for, and one or two details a shopper would want to know.`,
		emoji: templateEmoji(department),
		origin: FALLBACK_ORIGIN
	};
}
/** Drafts a description for a product the manager is about to add. Never throws. */
async function draftDescription(env, input, fetchFn = fetch) {
	const config = aiConfig(env);
	if (config) try {
		const raw = await chatJson(config, [{
			role: "system",
			content: "You draft catalogue copy for a store. Reply with ONLY a JSON object: \"description\" (one or two plain sentences, at most 220 characters, no prices, no invented specifications) and \"emoji\" (one emoji that fits the product)."
		}, {
			role: "user",
			content: `Product name: ${input.name}\nDepartment: ${input.department}`
		}], fetchFn);
		const parsed = draftShape.parse(raw);
		return {
			description: parsed.description,
			emoji: parsed.emoji,
			origin: {
				source: "llm",
				provider: config.provider,
				model: config.model
			}
		};
	} catch {}
	return templateDraft(input.name, input.department);
}
// src/pages/api/manage/[action].ts
var _action__exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var listingForm = object({
	productId: string().trim().min(1).max(30),
	active: _enum(["0", "1"])
});
var featureForm = object({ productId: string().trim().min(1).max(30) });
var POST = async ({ params, request, cookies, redirect }) => {
	const form = await request.formData();
	const back = safeBack(form.get("back"), "/manage");
	if (!await currentStaff(db(), cookies.get("bamazon_staff")?.value)) return redirect(failure("/login", "Please sign in to continue."), 303);
	const conn = db();
	const fail = (message) => redirect(failure(back, message), 303);
	const done = (message) => redirect(notice(back, message), 303);
	switch (params.action) {
		case "restock": {
			const parsed = readForm(restockForm, form);
			if (!parsed.ok) return fail(parsed.message);
			return await adjustStock(conn, parsed.data.productId, parsed.data.delta) ? done("Stock updated.") : fail("Couldn't update stock. Stock can't go below zero.");
		}
		case "price": {
			const parsed = readForm(priceForm, form);
			if (!parsed.ok) return fail(parsed.message);
			return await setPrice(conn, parsed.data.productId, parsed.data.priceCents) ? done("Price saved.") : fail("That product doesn't exist.");
		}
		case "listing": {
			const parsed = readForm(listingForm, form);
			if (!parsed.ok) return fail(parsed.message);
			const active = parsed.data.active === "1";
			return await setActive(conn, parsed.data.productId, active) ? done(active ? "Now showing in the shop." : "Hidden from the shop.") : fail("That product doesn't exist.");
		}
		case "product": {
			const parsed = readForm(newProductForm, form);
			if (!parsed.ok) return fail(parsed.message);
			if (!(await listDepartments(conn)).some((department) => department.id === parsed.data.departmentId)) return fail("That department doesn't exist.");
			try {
				await addProduct(conn, {
					id: parsed.data.id,
					name: parsed.data.name,
					description: parsed.data.description,
					emoji: parsed.data.emoji,
					departmentId: parsed.data.departmentId,
					priceCents: parsed.data.priceCents,
					stock: parsed.data.stock
				});
			} catch (error) {
				if (String(error).includes("UNIQUE")) return fail(`SKU ${parsed.data.id} is already in use.`);
				throw error;
			}
			return done(`Added ${parsed.data.name}.`);
		}
		case "feature": {
			const parsed = readForm(featureForm, form);
			if (!parsed.ok) return fail(parsed.message);
			return await featureProduct(conn, parsed.data.productId) ? done("Featured as the deal of the day.") : fail("That product doesn't exist.");
		}
		case "draft": {
			const parsed = readForm(draftForm, form);
			if (!parsed.ok) return fail(parsed.message);
			const department = (await listDepartments(conn)).find((entry) => entry.id === parsed.data.departmentId);
			if (!department) return fail("That department doesn't exist.");
			const draft = await draftDescription(bindings, {
				name: parsed.data.name,
				department: department.name
			});
			return redirect(withParams(back, {
				dname: parsed.data.name,
				ddept: String(department.id),
				ddesc: draft.description,
				demoji: draft.emoji,
				dsrc: draft.origin.source,
				...draft.origin.source === "llm" ? { dprov: `${draft.origin.provider} (${draft.origin.model})` } : {}
			}), 303);
		}
		case "department": {
			const parsed = readForm(departmentForm, form);
			if (!parsed.ok) return fail(parsed.message);
			try {
				await addDepartment(conn, parsed.data.name, parsed.data.overheadCents);
			} catch (error) {
				if (String(error).includes("UNIQUE")) return fail(`${parsed.data.name} already exists.`);
				throw error;
			}
			return done(`Created ${parsed.data.name}.`);
		}
		case "overhead": {
			const parsed = readForm(overheadForm, form);
			if (!parsed.ok) return fail(parsed.message);
			return await setOverhead(conn, parsed.data.departmentId, parsed.data.overheadCents) ? done("Overhead saved.") : fail("That department doesn't exist.");
		}
		default: return new Response("Not found", { status: 404 });
	}
};
// \0virtual:astro:page:src/pages/api/manage/[action]@_@ts
var page = () => _action__exports;
export { page };

//# sourceMappingURL=_action__SHgsdeYj.mjs.map