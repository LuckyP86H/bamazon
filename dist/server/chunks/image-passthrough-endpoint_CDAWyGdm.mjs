globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { m as isRemotePath, n as isRemoteAllowed, t as imageConfig } from "./_astro_assets_CB_6MZHj.mjs";
import { env } from "cloudflare:workers";
// node_modules/astro/dist/assets/utils/redirectValidation.js
/**
* Recursively follows HTTP redirects with validation according to the image configuration.
*
* If any of the domains in the redirect chain are not allowed by either `image.remotePatterns`
* or `image.domains`, this function will throw an error for a disallowed redirect.
*
* @param options The options for this fetch call.
*/
async function fetchWithRedirects(options) {
	const { url, headers, imageConfig, fetchFn = globalThis.fetch, redirectLimit = 10, onMaxRedirectsExceeded = (_u) => /* @__PURE__ */ new Error("Maximum redirect depth exceeded"), onMissingLocationHeader = (_s, _u) => /* @__PURE__ */ new Error(`Redirect response ${_s} missing Location header`), onDisallowedRedirect = (_current, _target) => /* @__PURE__ */ new Error(`The image at ${_current} redirected to ${_target}, which is not an allowed remote location.`) } = options;
	if (redirectLimit <= 0) throw onMaxRedirectsExceeded(typeof url === "string" ? url : url.toString());
	const urlString = typeof url === "string" ? url : url.toString();
	const res = await fetchFn(new Request(url, { headers }), { redirect: "manual" });
	if ([
		301,
		302,
		303,
		307,
		308
	].includes(res.status)) {
		const location = res.headers.get("Location");
		if (!location) throw onMissingLocationHeader(res.status, urlString);
		const redirectUrl = new URL(location, urlString).toString();
		if (!isRemoteAllowed(redirectUrl, {
			domains: imageConfig.domains ?? [],
			remotePatterns: imageConfig.remotePatterns ?? []
		})) throw onDisallowedRedirect(urlString, redirectUrl);
		return fetchWithRedirects({
			url: redirectUrl,
			headers,
			imageConfig,
			fetchFn,
			redirectLimit: redirectLimit - 1,
			onMaxRedirectsExceeded,
			onMissingLocationHeader,
			onDisallowedRedirect
		});
	}
	return res;
}
// node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint.js
var image_passthrough_endpoint_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = async ({ request }) => {
	try {
		const url = new URL(request.url);
		const href = url.searchParams.get("href");
		if (!href) return new Response("Bad Request", { status: 400 });
		const isRemote = isRemotePath(href);
		let response;
		if (isRemote) {
			if (!isRemoteAllowed(href, imageConfig)) return new Response("Forbidden", { status: 403 });
			response = await fetchWithRedirects({
				url: href,
				imageConfig
			});
		} else {
			const sourceUrl = new URL(href, url.origin);
			if (sourceUrl.origin !== url.origin) return new Response("Forbidden", { status: 403 });
			response = await env.ASSETS.fetch(new Request(sourceUrl, { headers: request.headers }));
		}
		if (response.status >= 300 && response.status < 400) return new Response("Not Found", { status: 404 });
		if (!response.ok) return new Response("Not Found", { status: 404 });
		const contentType = response.headers.get("Content-Type") ?? "";
		if (!contentType.startsWith("image/")) return new Response("Forbidden", { status: 403 });
		const headers = new Headers();
		headers.set("Content-Type", contentType);
		headers.set("Cache-Control", "public, max-age=31536000");
		headers.set("Date", (/* @__PURE__ */ new Date()).toUTCString());
		const etag = response.headers.get("ETag");
		if (etag) headers.set("ETag", etag);
		return new Response(response.body, {
			status: 200,
			headers
		});
	} catch (_err) {
		return new Response("Internal Server Error", { status: 500 });
	}
};
// \0virtual:astro:page:node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint@_@js
var page = () => image_passthrough_endpoint_exports;
export { page };

//# sourceMappingURL=image-passthrough-endpoint_CDAWyGdm.mjs.map