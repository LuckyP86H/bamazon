globalThis.process ??= {};
globalThis.process.env ??= {};
import { c as string, i as email, o as object, t as ZodNumber, u as _coercedNumber } from "./schemas_CwnbVb1E.mjs";
import "./cart_GXPUGlpI.mjs";
import { n as parseDollarsToCents } from "./money_SSkbaoHL.mjs";
// node_modules/zod/v4/classic/coerce.js
function number(params) {
	return _coercedNumber(ZodNumber, params);
}
// src/lib/validation.ts
/** Form fields arrive as strings. Each schema says exactly what a valid value looks like. */
var text = (max) => string().trim().min(1).max(max);
var checkoutForm = object({
	name: text(80),
	email: string().trim().toLowerCase().pipe(email().max(254))
});
var quantityField = number({ error: "Enter a quantity, like 2" }).int({ error: "Quantities are whole numbers, no fractions" }).min(0, { error: "Quantity can't be less than zero" }).max(99, { error: `You can order at most 99 of one item` });
var restockForm = object({
	productId: text(30),
	delta: number().int().min(-1e4).max(1e4).refine((value) => value !== 0, "Enter a non-zero amount")
});
var newProductForm = object({
	id: string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9 _-]{1,29}$/, "SKU: 2 to 30 letters, numbers, spaces, - or _"),
	name: text(120),
	description: string().trim().max(1e3),
	emoji: string().trim().min(1).max(8),
	departmentId: number().int().positive(),
	priceCents: string().transform((value, ctx) => {
		const cents = parseDollarsToCents(value);
		if (cents === null) ctx.addIssue({
			code: "custom",
			message: "Enter a price like 12.50"
		});
		return cents ?? 0;
	}),
	stock: number().int().min(0).max(1e5)
});
/** The description-draft form: just enough for the drafting module to work with. */
var draftForm = object({
	name: text(120),
	departmentId: number().int().positive()
});
var priceForm = object({
	productId: text(30),
	priceCents: string().transform((value, ctx) => {
		const cents = parseDollarsToCents(value);
		if (cents === null) ctx.addIssue({
			code: "custom",
			message: "Enter a price like 12.50"
		});
		return cents ?? 0;
	})
});
var departmentForm = object({
	name: text(60),
	overheadCents: string().transform((value, ctx) => {
		const cents = parseDollarsToCents(value);
		if (cents === null) ctx.addIssue({
			code: "custom",
			message: "Enter an overhead like 10000"
		});
		return cents ?? 0;
	})
});
var overheadForm = object({
	departmentId: number().int().positive(),
	overheadCents: string().transform((value, ctx) => {
		const cents = parseDollarsToCents(value);
		if (cents === null) ctx.addIssue({
			code: "custom",
			message: "Enter an overhead like 10000"
		});
		return cents ?? 0;
	})
});
/** Reads a form, or returns the first problem as a message for the user. */
function readForm(schema, data) {
	const input = data instanceof FormData ? Object.fromEntries(data) : data;
	const parsed = schema.safeParse(input);
	if (parsed.success) return {
		ok: true,
		data: parsed.data
	};
	return {
		ok: false,
		message: parsed.error.issues[0]?.message ?? "Please check the form"
	};
}
export { overheadForm as a, readForm as c, newProductForm as i, restockForm as l, departmentForm as n, priceForm as o, draftForm as r, quantityField as s, checkoutForm as t };

//# sourceMappingURL=validation_-1CInUT3.mjs.map