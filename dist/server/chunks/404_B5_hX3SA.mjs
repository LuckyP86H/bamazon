globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { d as maybeRenderHead, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent, t as $$Layout } from "./Layout_v-iFxU-K.mjs";
// src/pages/404.astro
var _404_exports = /* @__PURE__ */ __exportAll({
	default: () => $$404,
	file: () => $$file,
	url: () => $$url
});
var $$404 = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Not found" }, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<p class="empty">That page doesn't exist. <a href="/">Back to the shop</a>.</p>` })}`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/pages/404.astro", void 0);
var $$file = "/Users/phzxu/Downloads/projects/bamazon/src/pages/404.astro";
var $$url = "/404";
// \0virtual:astro:page:src/pages/404@_@astro
var page = () => _404_exports;
export { page };

//# sourceMappingURL=404_B5_hX3SA.mjs.map