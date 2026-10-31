import type { APIRoute } from "astro";
import { STAFF_COOKIE, closeStaffSession } from "../lib/auth";
import { db } from "../lib/runtime";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  await closeStaffSession(db(), cookies.get(STAFF_COOKIE)?.value);
  cookies.delete(STAFF_COOKIE, { path: "/" });
  return redirect("/", 303);
};
