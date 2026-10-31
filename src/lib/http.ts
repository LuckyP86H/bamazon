/** Redirect helpers. Only same-site paths are accepted as "back" targets, so no open redirects. */

export function safeBack(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/",
): string {
  if (typeof value !== "string") return fallback;
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function withParams(path: string, params: Record<string, string>): string {
  const [pathname = "/", query = ""] = path.split("?");
  const search = new URLSearchParams(query);
  for (const [key, value] of Object.entries(params)) search.set(key, value);
  const text = search.toString();
  return text ? `${pathname}?${text}` : pathname;
}

export const notice = (path: string, message: string) => withParams(path, { notice: message });
export const failure = (path: string, message: string) => withParams(path, { error: message });
