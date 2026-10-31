import type { CartItems } from "./cart";
import { overStock, priceCart, toPriced } from "./cart-lines";
import { placeOrder, productsByIds, type Db, type NewOrderLine } from "./db";

// No 0/O or 1/I, so an order number can be read out loud or typed from a receipt.
const ORDER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function newOrderId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((byte) => ORDER_ALPHABET[byte % ORDER_ALPHABET.length]).join("");
}

export type CheckoutResult =
  | { ok: true; orderId: string; totalCents: number }
  | { ok: false; message: string };

/**
 * Turns a cart into an order. Prices and stock come from the database, never from the cookie.
 * Stock is re-checked inside the atomic batch, so a concurrent sale can't oversell.
 */
export async function checkout(
  db: Db,
  items: CartItems,
  customer: { name: string; email: string },
  orderId: string,
): Promise<CheckoutResult> {
  if (Object.keys(items).length === 0) return { ok: false, message: "Your cart is empty." };

  const products = (await productsByIds(db, Object.keys(items))).map(toPriced);
  const cart = priceCart(items, products);
  if (cart.lines.length === 0) {
    return { ok: false, message: "None of the items in your cart are available any more." };
  }
  const short = overStock(cart);
  if (short.length > 0) {
    const first = short[0];
    return {
      ok: false,
      message: `Only ${first?.product.stock} of "${first?.product.name}" left. Please lower the quantity.`,
    };
  }

  const lines: NewOrderLine[] = cart.lines.map((line) => ({
    productId: line.product.id,
    name: line.product.name,
    unitPriceCents: line.product.priceCents,
    quantity: line.quantity,
  }));
  try {
    await placeOrder(db, {
      id: orderId,
      customerName: customer.name,
      customerEmail: customer.email,
      lines,
      totalCents: cart.totalCents,
    });
  } catch (error) {
    // The CHECK constraint rejected a stock or availability change that happened mid-checkout.
    if (String(error).includes("CHECK constraint")) {
      return {
        ok: false,
        message: "Stock changed while you were checking out. Please review your cart.",
      };
    }
    throw error;
  }
  return { ok: true, orderId, totalCents: cart.totalCents };
}
