import type { APIRoute } from "astro";
import {
  STAFF_COOKIE,
  OAUTH_COOKIE,
  SESSION_MS,
  githubClient,
  isStaffLogin,
  openStaffSession,
} from "../../../lib/auth";
import { failure } from "../../../lib/http";
import { db, bindings } from "../../../lib/runtime";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const client = githubClient(bindings, url.origin);
  const state = cookies.get(OAUTH_COOKIE)?.value ?? "";
  cookies.delete(OAUTH_COOKIE, { path: "/auth/github" });

  if (!client || !state || url.searchParams.get("state") !== state) {
    return redirect(failure("/login", "That sign-in link has expired. Please try again."), 303);
  }
  const code = url.searchParams.get("code");
  if (!code) return redirect(failure("/login", "Sign-in was cancelled."), 303);

  try {
    const tokens = await client.validateAuthorizationCode(code);
    const response = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokens.accessToken()}`, "User-Agent": "bamazon" },
    });
    if (!response.ok) throw new Error(`GitHub user lookup failed: ${response.status}`);
    const user = (await response.json()) as { login: string };

    if (!isStaffLogin(bindings, user.login)) {
      return redirect(failure("/login", "That GitHub account isn't on the staff list."), 303);
    }
    const token = await openStaffSession(db(), user.login);
    cookies.set(STAFF_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      maxAge: SESSION_MS / 1000,
    });
    return redirect("/manage", 303);
  } catch (error) {
    console.error("staff sign-in failed", error);
    return redirect(failure("/login", "Sign-in failed. Please try again."), 303);
  }
};
