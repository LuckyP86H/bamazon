import { describe, expect, test } from "bun:test";
import {
  MAX_LINES,
  MAX_QUANTITY,
  addToCart,
  cartCount,
  decodeCart,
  encodeCart,
  setQuantity,
} from "../src/lib/cart";
import { priceCart, overStock } from "../src/lib/cart-lines";
import type { PricedProduct } from "../src/lib/cart-lines";

const product = (overrides: Partial<PricedProduct> & { id: string }): PricedProduct => ({
  name: overrides.id,
  emoji: "📦",
  priceCents: 1000,
  stock: 10,
  active: true,
  ...overrides,
});

describe("cart cookie", () => {
  test("round-trips items, including non-ASCII ids", () => {
    const items = { "BOO HWN": 2, 書: 1 };
    expect(decodeCart(encodeCart(items))).toEqual(items);
  });

  test("treats garbage, tampered and oversized values as an empty cart", () => {
    expect(decodeCart(undefined)).toEqual({});
    expect(decodeCart("not base64 !!")).toEqual({});
    expect(decodeCart(encodeCart({ X: 500 }))).toEqual({});
    const tooMany = Object.fromEntries(
      Array.from({ length: MAX_LINES + 1 }, (_, i) => [`ID${i}`, 1]),
    );
    expect(decodeCart(encodeCart(tooMany))).toEqual({});
  });

  test("adding caps the quantity", () => {
    expect(addToCart({ A: 98 }, "A", 5)).toEqual({ A: MAX_QUANTITY });
  });

  test("setting zero removes the line", () => {
    expect(setQuantity({ A: 2, B: 1 }, "A", 0)).toEqual({ B: 1 });
    expect(cartCount({ A: 2, B: 1 })).toBe(3);
  });
});

describe("pricing a cart", () => {
  test("totals from the catalogue price, not anything the cookie says", () => {
    const priced = priceCart({ A: 2, B: 1 }, [
      product({ id: "A", priceCents: 250 }),
      product({ id: "B", priceCents: 1000 }),
    ]);
    expect(priced.totalCents).toBe(1500);
    expect(priced.lines.map((line) => line.lineCents)).toEqual([500, 1000]);
  });

  test("drops items that are gone, hidden or sold out, and reports them", () => {
    const priced = priceCart({ GONE: 1, HIDDEN: 1, SOLD: 1, OK: 1 }, [
      product({ id: "HIDDEN", active: false }),
      product({ id: "SOLD", stock: 0 }),
      product({ id: "OK" }),
    ]);
    expect(priced.lines.map((line) => line.product.id)).toEqual(["OK"]);
    expect(priced.unavailable.sort()).toEqual(["GONE", "HIDDEN", "SOLD"]);
  });

  test("flags lines that want more than the shelf holds", () => {
    const priced = priceCart({ A: 5, B: 1 }, [
      product({ id: "A", stock: 2 }),
      product({ id: "B", stock: 9 }),
    ]);
    expect(overStock(priced).map((line) => line.product.id)).toEqual(["A"]);
  });
});
