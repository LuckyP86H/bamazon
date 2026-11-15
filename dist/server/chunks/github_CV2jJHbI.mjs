globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { c as newOAuthState, o as githubClient, t as OAUTH_COOKIE } from "./auth_CX-A95a0.mjs";
import { t as failure } from "./http_Bf-GMA0N.mjs";
import { t as bindings } from "./runtime_BJ0x1Rmi.mjs";
// src/pages/auth/github.ts
var github_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = ({ url, cookies, redirect }) => {
	const client = githubClient(bindings, url.origin);
	if (!client) return redirect(failure("/login", "GitHub sign-in isn't configured yet."), 303);
	const state = newOAuthState();
	cookies.set(OAUTH_COOKIE, state, {
		path: "/auth/github",
		httpOnly: true,
		sameSite: "lax",
		secure: url.protocol === "https:",
		maxAge: 600
	});
	return redirect(client.createAuthorizationURL(state, ["read:user"]).toString(), 302);
};
// \0virtual:astro:page:src/pages/auth/github@_@ts
var page = () => github_exports;
export { page };

//# sourceMappingURL=github_CV2jJHbI.mjs.map