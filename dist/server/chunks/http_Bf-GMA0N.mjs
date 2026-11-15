globalThis.process ??= {};
globalThis.process.env ??= {};
// src/lib/http.ts
/** Redirect helpers. Only same-site paths are accepted as "back" targets, so no open redirects. */
function safeBack(value, fallback = "/") {
	if (typeof value !== "string") return fallback;
	return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
function withParams(path, params) {
	const [pathname = "/", query = ""] = path.split("?");
	const search = new URLSearchParams(query);
	for (const [key, value] of Object.entries(params)) search.set(key, value);
	const text = search.toString();
	return text ? `${pathname}?${text}` : pathname;
}
var notice = (path, message) => withParams(path, { notice: message });
var failure = (path, message) => withParams(path, { error: message });
export { withParams as i, notice as n, safeBack as r, failure as t };

//# sourceMappingURL=http_Bf-GMA0N.mjs.map