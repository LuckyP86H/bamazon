globalThis.process ??= {};
globalThis.process.env ??= {};
import { R as AstroError, X as InvalidComponentArgs, b as createAstro, f as renderHead, p as addAttribute, s as renderSlot, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { i as decodeCart, r as cartCount, t as CART_COOKIE } from "./cart_GXPUGlpI.mjs";
// node_modules/astro/dist/runtime/server/astro-component.js
function validateArgs(args) {
	if (args.length !== 3) return false;
	if (!args[0] || typeof args[0] !== "object") return false;
	return true;
}
function baseCreateComponent(cb, moduleId, propagation) {
	const name = moduleId?.split("/").pop()?.replace(".astro", "") ?? "";
	const fn = (...args) => {
		if (!validateArgs(args)) throw new AstroError({
			...InvalidComponentArgs,
			message: InvalidComponentArgs.message(name)
		});
		return cb(...args);
	};
	Object.defineProperty(fn, "name", {
		value: name,
		writable: false
	});
	fn.isAstroComponentFactory = true;
	fn.moduleId = moduleId;
	fn.propagation = propagation;
	return fn;
}
function createComponentWithOptions(opts) {
	return baseCreateComponent(opts.factory, opts.moduleId, opts.propagation);
}
function createComponent(arg1, moduleId, propagation) {
	if (typeof arg1 === "function") return baseCreateComponent(arg1, moduleId, propagation);
	else return createComponentWithOptions(arg1);
}
// src/components/Layout.astro
createAstro("https://astro.build");
var $$Layout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Layout;
	const { title, description = "Bamazon: a storefront with a cart, checkout and a back office.", staff = null } = Astro.props;
	const count = cartCount(decodeCart(Astro.cookies.get(CART_COOKIE)?.value));
	const notice = Astro.url.searchParams.get("notice");
	const error = Astro.url.searchParams.get("error");
	const q = Astro.url.searchParams.get("q") ?? "";
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description"${addAttribute(description, "content")}><meta name="color-scheme" content="light dark"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>${title} · Bamazon</title>${renderHead($$result)}</head><body><a class="skip" href="#main">Skip to content</a><header class="top"><a class="brand" href="/"><span class="logo" aria-hidden="true">🛒</span><span>bamazon</span></a><form class="search" role="search" action="/" method="get"><label class="sr-only" for="q">Search products</label><input id="q" name="q" type="search" placeholder="Search books, electronics, kitchen…"${addAttribute(q, "value")} autocomplete="off"><button type="submit">Search</button></form><nav class="nav" aria-label="Main">${staff ? renderTemplate`<a href="/manage">Back office</a>` : renderTemplate`<a href="/login">Staff sign-in</a>`}<a class="cart" href="/cart"><span>Cart</span><span class="badge"${addAttribute(count, "data-count")}>${count}<span class="sr-only"> items</span></span></a></nav></header><main id="main" tabindex="-1">${notice && renderTemplate`<p class="flash ok" role="status">${notice}</p>`}${error && renderTemplate`<p class="flash bad" role="alert">${error}</p>`}${renderSlot($$result, $$slots["default"])}</main><footer class="foot"><p>Bamazon is a demo storefront. No payment is taken and no email is sent. Built with Astro on Cloudflare Workers and D1.</p></footer></body></html>`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/components/Layout.astro", void 0);
export { createComponent as n, $$Layout as t };

//# sourceMappingURL=Layout_v-iFxU-K.mjs.map