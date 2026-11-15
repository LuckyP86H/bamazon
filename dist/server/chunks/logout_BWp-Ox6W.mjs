globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { i as closeStaffSession, r as STAFF_COOKIE } from "./auth_CX-A95a0.mjs";
import { n as db } from "./runtime_BJ0x1Rmi.mjs";
// src/pages/logout.ts
var logout_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ cookies, redirect }) => {
	await closeStaffSession(db(), cookies.get(STAFF_COOKIE)?.value);
	cookies.delete(STAFF_COOKIE, { path: "/" });
	return redirect("/", 303);
};
// \0virtual:astro:page:src/pages/logout@_@ts
var page = () => logout_exports;
export { page };

//# sourceMappingURL=logout_BWp-Ox6W.mjs.map