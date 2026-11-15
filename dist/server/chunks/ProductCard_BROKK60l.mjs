globalThis.process ??= {};
globalThis.process.env ??= {};
import { b as createAstro, d as maybeRenderHead, i as Fragment, p as addAttribute, r as renderComponent, u as renderTemplate } from "./compiler_c4iFfuVH.mjs";
import { n as createComponent } from "./Layout_v-iFxU-K.mjs";
import { n as stockStatus, t as stockLabel } from "./stock_Ciufyotm.mjs";
import { t as formatUsd } from "./money_SSkbaoHL.mjs";
// src/components/ProductCard.astro
createAstro("https://astro.build");
var $$ProductCard = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ProductCard;
	const { product } = Astro.props;
	const status = stockStatus(product.stock);
	return renderTemplate`${maybeRenderHead($$result)}<article class="card"${addAttribute(status, "data-stock")}><a class="art"${addAttribute(`/products/${encodeURIComponent(product.id)}`, "href")} tabindex="-1" aria-hidden="true">${product.emoji}</a><div class="body"><p class="dept">${product.department}${product.featured === 1 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · <strong>Deal of the day</strong>` })}`}</p><h2 class="name"><a${addAttribute(`/products/${encodeURIComponent(product.id)}`, "href")}>${product.name}</a></h2><p class="price">${formatUsd(product.price_cents)}</p><p${addAttribute(`stock ${status}`, "class")}>${stockLabel(product.stock)}</p>${status === "out" ? renderTemplate`<button type="button" disabled>Sold out</button>` : renderTemplate`<form method="post" action="/api/cart"><input type="hidden" name="intent" value="add"><input type="hidden" name="productId"${addAttribute(product.id, "value")}><input type="hidden" name="quantity" value="1"><input type="hidden" name="back" value="/"><button type="submit">Add to cart</button></form>`}</div></article>`;
}, "/Users/phzxu/Downloads/projects/bamazon/src/components/ProductCard.astro", void 0);
export { $$ProductCard as t };

//# sourceMappingURL=ProductCard_BROKK60l.mjs.map