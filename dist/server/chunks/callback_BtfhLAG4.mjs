globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_COXxpbMV.mjs";
import { l as openStaffSession, n as SESSION_MS, o as githubClient, r as STAFF_COOKIE, s as isStaffLogin, t as OAUTH_COOKIE } from "./auth_CX-A95a0.mjs";
import { t as failure } from "./http_Bf-GMA0N.mjs";
import { n as db, t as bindings } from "./runtime_BJ0x1Rmi.mjs";
// src/pages/auth/github/callback.ts
var callback_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async ({ url, cookies, redirect }) => {
	const client = githubClient(bindings, url.origin);
	const state = cookies.get("bamazon_oauth")?.value ?? "";
	cookies.delete(OAUTH_COOKIE, { path: "/auth/github" });
	if (!client || !state || url.searchParams.get("state") !== state) return redirect(failure("/login", "That sign-in link has expired. Please try again."), 303);
	const code = url.searchParams.get("code");
	if (!code) return redirect(failure("/login", "Sign-in was cancelled."), 303);
	try {
		const tokens = await client.validateAuthorizationCode(code);
		const response = await fetch("https://api.github.com/user", { headers: {
			Authorization: `Bearer ${tokens.accessToken()}`,
			"User-Agent": "bamazon"
		} });
		if (!response.ok) throw new Error(`GitHub user lookup failed: ${response.status}`);
		const user = await response.json();
		if (!isStaffLogin(bindings, user.login)) return redirect(failure("/login", "That GitHub account isn't on the staff list."), 303);
		const token = await openStaffSession(db(), user.login);
		cookies.set(STAFF_COOKIE, token, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: url.protocol === "https:",
			maxAge: SESSION_MS / 1e3
		});
		return redirect("/manage", 303);
	} catch (error) {
		console.error("staff sign-in failed", error);
		return redirect(failure("/login", "Sign-in failed. Please try again."), 303);
	}
};
// \0virtual:astro:page:src/pages/auth/github/callback@_@ts
var page = () => callback_exports;
export { page };

//# sourceMappingURL=callback_BtfhLAG4.mjs.map