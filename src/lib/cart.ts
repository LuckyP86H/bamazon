import { z } from "zod";

/**
 * The cart lives in a cookie as { productId: quantity }. The cookie is only a shopping list: the
 * server re-reads prices and stock from the database at every step, so editing it gains nothing.
 */
export const MAX_QUANTITY = 99;
export const MAX_LINES = 40;
export const CART_COOKIE = "bamazon_cart";

export type CartItems = Record<string, number>;

const cartSchema = z
  .record(z.string().min(1).max(30), z.number().int().min(1).max(MAX_QUANTITY))
  .refine((items) => Object.keys(items).length <= MAX_LINES);

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const fromBase64Url = (value: string) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function encodeCart(items: CartItems): string {
  return toBase64Url(JSON.stringify(items));
}

/** Anything unreadable or out of range is treated as an empty cart rather than an error. */
export function decodeCart(value: string | undefined): CartItems {
  if (!value) return {};
  try {
    const parsed = cartSchema.safeParse(JSON.parse(fromBase64Url(value)));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function addToCart(items: CartItems, productId: string, quantity: number): CartItems {
  const current = items[productId] ?? 0;
  const next = Math.min(MAX_QUANTITY, current + quantity);
  return { ...items, [productId]: next };
}

/** Setting a quantity to zero removes the line. */
export function setQuantity(items: CartItems, productId: string, quantity: number): CartItems {
  if (quantity <= 0) {
    const { [productId]: _removed, ...rest } = items;
    return rest;
  }
  return { ...items, [productId]: Math.min(MAX_QUANTITY, quantity) };
}

export function cartCount(items: CartItems): number {
  return Object.values(items).reduce((sum, quantity) => sum + quantity, 0);
}
