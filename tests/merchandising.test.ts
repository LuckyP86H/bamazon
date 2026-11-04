import { describe, expect, test } from "bun:test";
import {
  featureProduct,
  getFeaturedProduct,
  getProduct,
  placeOrder,
  type NewOrder,
} from "../src/lib/db";
import { buildPanel, productSignals, suggestedRestockQuantity } from "../src/lib/merchandising";
import { testDb } from "./support";

const order = (
  id: string,
  productId: string,
  name: string,
  price: number,
  qty: number,
): NewOrder => ({
  id,
  customerName: "Ada",
  customerEmail: "ada@example.com",
  totalCents: price * qty,
  lines: [{ productId, name, unitPriceCents: price, quantity: qty }],
});

describe("productSignals", () => {
  test("an out-of-stock product with no sales is urgent for the shelf reason alone", async () => {
    const { db } = testDb();
    const product = await getProduct(db, "BOO HWN"); // stock 0 in the seed
    const signals = productSignals(product!, undefined, 0);
    expect(signals.daysOfCover).toBeNull();
    expect(signals.urgency).toBeCloseTo(0.75);
    expect(signals.reasons[0]).toBe("Out of stock");
  });

  test("sales turn into days of cover and reasons a manager can check", async () => {
    const { db } = testDb();
    // Sell 30 bottles in one order: stock 40 → 10, so cover is 10 days at that rate.
    await placeOrder(
      db,
      order("ORDER00001", "SPT BTL02", "Insulated Water Bottle, 750 ml", 2299, 30),
    );
    const product = await getProduct(db, "SPT BTL02");
    const signals = productSignals(
      product!,
      { productId: "SPT BTL02", unitsRecent: 30, revenueRecentCents: 30 * 2299 },
      30 * 2299,
    );
    expect(signals.daysOfCover).toBeCloseTo(10);
    expect(signals.reasons).toContain("Sold 30 in the last 30 days");
    expect(signals.reasons).toContain("About 10 days of cover at that rate");
    expect(suggestedRestockQuantity(signals)).toBe(20);
  });

  test("the restock rule floors at 10 units and never goes negative", async () => {
    const { db } = testDb();
    const product = await getProduct(db, "CLO TEE01"); // stock 30, no sales
    const signals = productSignals(product!, undefined, 0);
    expect(suggestedRestockQuantity(signals)).toBe(0);
  });
});

describe("buildPanel with the demo judge", () => {
  test("a fresh store: scored, sorted, demo-labelled, and nothing is written", async () => {
    const { db } = testDb();
    const panel = await buildPanel(db, {});
    expect(panel.judge).toBe("demo");
    expect(panel.scored.length).toBeGreaterThan(0);
    const scores = panel.scored.map((entry) => entry.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    // The two sold-out seed products lead the list on the shelf signal alone.
    expect(panel.scored[0]?.signals.product.stock).toBe(0);
    // A purchase-order draft exists for a sold-out product: floor of 10 units.
    expect(panel.purchaseOrder?.product.stock).toBe(0);
    expect(panel.purchaseOrder?.quantity).toBe(10);
    expect(panel.purchaseOrder?.approved).toBe(true);
    // The judge proposed things; it changed nothing by itself.
    expect(await getFeaturedProduct(db)).toBeNull();
  });

  test("a strong seller with thinning cover earns an approved deal proposal", async () => {
    const { db } = testDb();
    await placeOrder(
      db,
      order("ORDER00001", "SPT BTL02", "Insulated Water Bottle, 750 ml", 2299, 30),
    );
    const panel = await buildPanel(db, {});
    expect(panel.deal?.product.id).toBe("SPT BTL02");
    expect(panel.deal?.approved).toBe(true);
    expect(panel.deal?.score).toBeGreaterThanOrEqual(50);
  });
});

describe("featuring", () => {
  test("featuring one product clears any previous deal", async () => {
    const { db } = testDb();
    expect(await featureProduct(db, "SPT BTL02")).toBe(true);
    expect((await getFeaturedProduct(db))?.id).toBe("SPT BTL02");
    expect(await featureProduct(db, "BOO NOTE")).toBe(true);
    expect((await getFeaturedProduct(db))?.id).toBe("BOO NOTE");
    expect(await featureProduct(db, "NOPE")).toBe(false);
  });
});
