/**
 * Staff sign-in with GitHub (OAuth authorization code, with a one-time `state` check). No
 * passwords are stored. A GitHub login only gets in if it appears in STAFF_GITHUB_LOGINS.
 */
import { GitHub, generateState } from "arctic";
import { createStaffSession, deleteStaffSession, findStaffSession, type Db } from "./db";

export const STAFF_COOKIE = "bamazon_staff";
export const OAUTH_COOKIE = "bamazon_oauth";
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthEnv {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  STAFF_GITHUB_LOGINS?: string;
}

export function staffAllowlist(env: AuthEnv): Set<string> {
  return new Set(
    (env.STAFF_GITHUB_LOGINS ?? "")
      .split(",")
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const isStaffLogin = (env: AuthEnv, login: string) =>
  staffAllowlist(env).has(login.toLowerCase());

export function githubClient(env: AuthEnv, origin: string): GitHub | null {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return null;
  return new GitHub(
    env.GITHUB_CLIENT_ID,
    env.GITHUB_CLIENT_SECRET,
    `${origin}/auth/github/callback`,
  );
}

export function newOAuthState(): string {
  return generateState();
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function openStaffSession(db: Db, login: string, now = Date.now()): Promise<string> {
  const token = randomToken();
  await createStaffSession(db, await sha256Hex(token), login, now + SESSION_MS);
  return token;
}

/** The signed-in staff member's GitHub login, or null. Expired and unknown tokens both return null. */
export async function currentStaff(
  db: Db,
  token: string | undefined,
  now = Date.now(),
): Promise<string | null> {
  if (!token) return null;
  const row = await findStaffSession(db, await sha256Hex(token), now);
  return row?.github_login ?? null;
}

export async function closeStaffSession(db: Db, token: string | undefined): Promise<void> {
  if (token) await deleteStaffSession(db, await sha256Hex(token));
}
