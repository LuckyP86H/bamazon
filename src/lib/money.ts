/** Money is stored as whole cents. These helpers are the only place cents become text or back. */

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatUsd = (cents: number): string => usd.format(cents / 100);

const DOLLARS = /^(\d{1,7})(?:\.(\d{1,2}))?$/;

/** "12.5" → 1250, "3" → 300. Anything that isn't a plain positive amount returns null. */
export function parseDollarsToCents(input: string): number | null {
  const match = DOLLARS.exec(input.trim());
  if (!match) return null;
  const [, whole = "0", fraction = ""] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
