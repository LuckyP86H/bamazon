globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, p as addAttribute, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { a as currentStaff, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { c as departmentSummary, n as db } from "./runtime_BJ0x1Rmi.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/pages/manage/departments.astro
var departments_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Departments,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Departments = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Departments;
	const database = db();
	const staff = await currentStaff(database, Astro.cookies.get(STAFF_COOKIE)?.value);
	if (!staff) return Astro.redirect("/login");
	const rows = await departmentSummary(database);
	const totals = rows.reduce((sum, row) => ({
		sales: sum.sales + row.sales_cents,
		overhead: sum.overhead + row.overhead_cents,
		profit: sum.profit + row.profit_cents
	}), {
		sales: 0,
		overhead: 0,
		profit: 0
	});
	const signed = (cents) => cents < 0 ? `−${formatUsd(-cents)}` : formatUsd(cents);
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Department sales",
		"staff": staff
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<p class="dept">Back office · supervisors</p><h1>Department sales</h1><p class="muted">Profit is sales minus overhead, worked out each time you load this page.</p><div class="scroll" style="margin-top: 16px;"><table aria-label="Product sales by department"><thead><tr><th scope="col">ID</th><th scope="col">Department</th><th scope="col" class="num">Products</th><th scope="col" class="num">Overhead</th><th scope="col" class="num">Product sales</th><th scope="col" class="num">Total profit</th><th scope="col">Update overhead</th></tr></thead><tbody>${rows.map((row) => renderTemplate`<tr><td>${String(row.id).padStart(2, "0")}</td><td>${row.name}</td><td class="num">${row.product_count}</td><td class="num">${formatUsd(row.overhead_cents)}</td><td class="num">${formatUsd(row.sales_cents)}</td><td${addAttribute(`num profit ${row.profit_cents < 0 ? "neg" : "pos"}`, "class")}>${signed(row.profit_cents)}</td><td><form method="post" action="/api/manage/overhead" class="inline"><input type="hidden" name="departmentId"${addAttribute(String(row.id), "value")}><input type="hidden" name="back" value="/manage/departments"><label class="sr-only"${addAttribute(`overhead-${row.id}`, "for")}>Overhead for ${row.name}</label><input${addAttribute(`overhead-${row.id}`, "id")} name="overheadCents" inputmode="decimal"${addAttribute((row.overhead_cents / 100).toFixed(2), "value")}><button type="submit" class="ghost">Save</button></form></td></tr>`)}</tbody><tfoot><tr><th scope="row" colspan="3">All departments</th><td class="num">${formatUsd(totals.overhead)}</td><td class="num">${formatUsd(totals.sales)}</td><td${addAttribute(`num profit ${totals.profit < 0 ? "neg" : "pos"}`, "class")}>${signed(totals.profit)}</td><td></td></tr></tfoot></table></div><section class="panel" aria-labelledby="new-dept" style="margin-top: 28px; max-width: 640px;"><h2 id="new-dept">Create a department</h2><form method="post" action="/api/manage/department" class="grid-form three"><input type="hidden" name="back" value="/manage/departments"><div class="field"><label for="dname">Name</label><input id="dname" name="name" required maxlength="60"></div><div class="field"><label for="doh">Overhead (USD)</label><input id="doh" name="overheadCents" inputmode="decimal" required placeholder="10000"></div><div><button type="submit">Create</button></div></form></section>` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/manage/departments.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/manage/departments.astro";
var $$url = "/manage/departments";
// \0virtual:astro:page:src/pages/manage/departments@_@astro
var page = () => departments_exports;
export { page };

//# sourceMappingURL=departments_-n82VhQ_.mjs.map