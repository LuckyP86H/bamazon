import { describe, expect, test } from "bun:test";
import { LOW_STOCK, stockLabel, stockStatus } from "../src/lib/stock";
import { CART_COOKIE } from "../src/lib/cart";

describe("stock status", () => {
  test("classifies out, low and in stock", () => {
    expect(stockStatus(0)).toBe("out");
    expect(stockStatus(LOW_STOCK - 1)).toBe("low");
    expect(stockStatus(LOW_STOCK)).toBe("in");
  });

  test("labels read naturally", () => {
    expect(stockLabel(0)).toBe("Out of stock");
    expect(stockLabel(3)).toBe("Only 3 left");
    expect(stockLabel(40)).toBe("40 in stock");
  });

  test("the cart cookie has a stable name", () => {
    expect(CART_COOKIE).toBe("bamazon_cart");
  });
});
