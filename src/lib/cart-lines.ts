import type { CartItems } from "./cart";

export interface PricedProduct {
  id: string;
  name: string;
  emoji: string;
  priceCents: number;
  stock: number;
  active: boolean;
}

/** A database row (snake_case, 0/1 flags) in the shape pricing works with. */
export function toPriced(row: {
  id: string;
  name: string;
  emoji: string;
  price_cents: number;
  stock: number;
  active: number;
}): PricedProduct {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    priceCents: row.price_cents,
    stock: row.stock,
    active: row.active === 1,
  };
}

export interface CartLine {
  product: PricedProduct;
  quantity: number;
  lineCents: number;
}

export interface PricedCart {
  lines: CartLine[];
  /** Items that are no longer sold or no longer exist. They are dropped from the total. */
  unavailable: string[];
  totalCents: number;
}

/** Prices a cart from the current catalogue. Quantities above the live stock are kept but flagged. */
export function priceCart(items: CartItems, products: PricedProduct[]): PricedCart {
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines: CartLine[] = [];
  const unavailable: string[] = [];
  for (const [id, quantity] of Object.entries(items)) {
    const product = byId.get(id);
    if (!product || !product.active || product.stock <= 0) {
      unavailable.push(id);
      continue;
    }
    lines.push({ product, quantity, lineCents: product.priceCents * quantity });
  }
  const totalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  return { lines, unavailable, totalCents };
}

/** Lines that ask for more than is on the shelf right now. */
export function overStock(cart: PricedCart): CartLine[] {
  return cart.lines.filter((line) => line.quantity > line.product.stock);
}
