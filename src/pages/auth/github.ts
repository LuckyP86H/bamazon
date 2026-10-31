import type { APIRoute } from "astro";
import { OAUTH_COOKIE, githubClient, newOAuthState } from "../../lib/auth";
import { failure } from "../../lib/http";
import { bindings } from "../../lib/runtime";

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const client = githubClient(bindings, url.origin);
  if (!client) return redirect(failure("/login", "GitHub sign-in isn't configured yet."), 303);

  const state = newOAuthState();
  cookies.set(OAUTH_COOKIE, state, {
    path: "/auth/github",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 600,
  });
  return redirect(client.createAuthorizationURL(state, ["read:user"]).toString(), 302);
};
