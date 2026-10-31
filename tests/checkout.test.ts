import { describe, expect, test } from "bun:test";
import { checkout, newOrderId } from "../src/lib/checkout";
import { getProduct, setActive } from "../src/lib/db";
import { testDb } from "./support";

const customer = { name: "Ada Lovelace", email: "ada@example.com" };

describe("checkout", () => {
  test("prices the order from the database and reports the total", async () => {
    const { db } = testDb();
    const result = await checkout(db, { "MOUSE 3509": 2, "BOO HP12": 1 }, customer, "ORDER00005");
    expect(result).toEqual({ ok: true, orderId: "ORDER00005", totalCents: 2 * 2999 + 1499 });
    expect((await getProduct(db, "BOO HP12"))?.stock).toBe(9);
  });

  test("refuses an empty cart and a cart with only unavailable items", async () => {
    const { db } = testDb();
    expect(await checkout(db, {}, customer, newOrderId())).toMatchObject({ ok: false });
    await setActive(db, "BOO HP12", false);
    expect(await checkout(db, { "BOO HP12": 1 }, customer, newOrderId())).toMatchObject({
      ok: false,
    });
  });

  test("asks for a smaller quantity when the shelf is short, without writing anything", async () => {
    const { db } = testDb();
    const result = await checkout(db, { "USB-C 65W": 9 }, customer, "ORDER00006");
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("Only 4") });
    expect((await getProduct(db, "USB-C 65W"))?.stock).toBe(4);
  });

  test("a stock change during checkout is reported as a clear, recoverable message", async () => {
    const { db, raw } = testDb();
    // Simulate a sale that lands between the stock check and the batch.
    const realAll = db.all.bind(db);
    db.all = async <T>(sql: string, params?: unknown[]) => {
      const rows = await realAll<T>(sql, params);
      raw.exec("UPDATE products SET stock = 0 WHERE id = 'USB-C 65W'");
      return rows;
    };
    const result = await checkout(db, { "USB-C 65W": 2 }, customer, "ORDER00007");
    expect(result).toEqual({
      ok: false,
      message: "Stock changed while you were checking out. Please review your cart.",
    });
  });

  test("order ids are ten characters from an unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(newOrderId()).toMatch(/^[23456789A-HJ-NP-Z]{10}$/);
    }
  });
});
