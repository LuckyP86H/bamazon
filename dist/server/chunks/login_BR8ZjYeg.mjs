globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { b as createAstro, d as maybeRenderHead, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
import { a as currentStaff } from "./auth_CX-A95a0.mjs";
import { n as db, t as bindings } from "./runtime_BJ0x1Rmi.mjs";
// src/pages/login.astro
var login_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Login,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Login = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Login;
	if (await currentStaff(db(), Astro.cookies.get("bamazon_staff")?.value)) return Astro.redirect("/manage");
	const configured = Boolean(bindings.GITHUB_CLIENT_ID && bindings.GITHUB_CLIENT_SECRET);
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Staff sign-in" }, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<section class="panel" style="max-width: 560px; margin: 24px auto;"><h1>Staff sign-in</h1><p class="muted">The back office is for managers and supervisors. Sign in with the GitHub account on the staff list.</p>${configured ? renderTemplate`<a class="button" href="/auth/github">Sign in with GitHub</a>` : renderTemplate`<p class="flash bad" role="status">GitHub sign-in isn't configured on this server yet. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.</p>`}</section>` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/login.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/login.astro";
var $$url = "/login";
// \0virtual:astro:page:src/pages/login@_@astro
var page = () => login_exports;
export { page };

//# sourceMappingURL=login_BR8ZjYeg.mjs.map