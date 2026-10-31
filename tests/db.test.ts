import { describe, expect, test } from "bun:test";
import {
  addDepartment,
  addProduct,
  adjustStock,
  departmentSummary,
  getOrder,
  getProduct,
  listProducts,
  lowStock,
  placeOrder,
  setActive,
  setOverhead,
  setPrice,
} from "../src/lib/db";
import { testDb } from "./support";

describe("catalogue queries", () => {
  test("hidden products never reach the shop", async () => {
    const { db } = testDb();
    await setActive(db, "BOO HP12", false);
    const shop = await listProducts(db);
    expect(shop.map((p) => p.id)).not.toContain("BOO HP12");
    const back = await listProducts(db, { includeInactive: true });
    expect(back.map((p) => p.id)).toContain("BOO HP12");
  });

  test("search matches name and description, and treats % and _ literally", async () => {
    const { db } = testDb();
    expect((await listProducts(db, { search: "wolves" })).map((p) => p.id)).toEqual(["BOO HWN"]);
    expect(await listProducts(db, { search: "%" })).toHaveLength(0);
    expect(await listProducts(db, { search: "_" })).toHaveLength(0);
  });

  test("filters by department and sorts by price", async () => {
    const { db } = testDb();
    const books = await listProducts(db, { departmentId: 2, sort: "price-asc" });
    expect(books.map((p) => p.price_cents)).toEqual([1299, 1499, 1856]);
    const priciest = await listProducts(db, { sort: "price-desc" });
    expect(priciest[0]?.id).toBe("Dell i3265-A643WHT-PUS");
  });

  test("low stock is under five and only counts listed items", async () => {
    const { db } = testDb();
    const low = (await lowStock(db, 5)).map((p) => p.id).sort();
    expect(low).toEqual(["BOO HWN", "CLO SOX03", "HOM MUG03", "USB-C 65W"]);
    await setActive(db, "USB-C 65W", false);
    expect((await lowStock(db, 5)).map((p) => p.id)).not.toContain("USB-C 65W");
  });
});

describe("placing orders", () => {
  test("an order decrements stock, records sales and copies the prices", async () => {
    const { db } = testDb();
    await placeOrder(db, {
      id: "ORDER00001",
      customerName: "Ada",
      customerEmail: "ada@example.com",
      totalCents: 2 * 2999,
      lines: [
        {
          productId: "MOUSE 3509",
          name: "Slim Wireless Keyboard and Mouse Combo",
          unitPriceCents: 2999,
          quantity: 2,
        },
      ],
    });
    const product = await getProduct(db, "MOUSE 3509");
    expect(product?.stock).toBe(13);
    expect(product?.product_sales_cents).toBe(5998);
    const order = await getOrder(db, "ORDER00001");
    expect(order?.order.total_cents).toBe(5998);
    expect(order?.items[0]?.unit_price_cents).toBe(2999);
  });

  test("overselling is refused and nothing at all is written", async () => {
    const { db } = testDb();
    const before = await getProduct(db, "USB-C 65W");
    await expect(
      placeOrder(db, {
        id: "ORDER00002",
        customerName: "Ada",
        customerEmail: "ada@example.com",
        totalCents: 99 * 3499,
        lines: [
          { productId: "BOO HP12", name: "Harry Potter", unitPriceCents: 1499, quantity: 1 },
          { productId: "USB-C 65W", name: "Charger", unitPriceCents: 3499, quantity: 99 },
        ],
      }),
    ).rejects.toThrow(/CHECK constraint/);
    expect((await getProduct(db, "USB-C 65W"))?.stock).toBe(before?.stock);
    expect((await getProduct(db, "BOO HP12"))?.stock).toBe(10);
    expect(await getOrder(db, "ORDER00002")).toBeNull();
  });

  test("a product that was hidden mid-checkout fails the order rather than selling", async () => {
    const { db } = testDb();
    await setActive(db, "BOO HP12", false);
    await expect(
      placeOrder(db, {
        id: "ORDER00003",
        customerName: "Ada",
        customerEmail: "ada@example.com",
        totalCents: 1499,
        lines: [{ productId: "BOO HP12", name: "Harry Potter", unitPriceCents: 1499, quantity: 1 }],
      }),
    ).rejects.toThrow(/CHECK constraint/);
    expect(await getOrder(db, "ORDER00003")).toBeNull();
  });
});

describe("back office", () => {
  test("restocking can add stock but never take it below zero", async () => {
    const { db } = testDb();
    expect(await adjustStock(db, "MOUSE 3509", 5)).toBe(true);
    expect((await getProduct(db, "MOUSE 3509"))?.stock).toBe(20);
    expect(await adjustStock(db, "MOUSE 3509", -21)).toBe(false);
    expect((await getProduct(db, "MOUSE 3509"))?.stock).toBe(20);
  });

  test("prices change and products can be added and listed", async () => {
    const { db } = testDb();
    expect(await setPrice(db, "MOUSE 3509", 2499)).toBe(true);
    expect((await getProduct(db, "MOUSE 3509"))?.price_cents).toBe(2499);
    await addProduct(db, {
      id: "NEW 1",
      name: "New thing",
      description: "",
      emoji: "✨",
      departmentId: 1,
      priceCents: 500,
      stock: 3,
    });
    expect((await getProduct(db, "NEW 1"))?.department).toBe("Electronics");
  });

  test("profit is sales minus overhead, worked out at read time", async () => {
    const { db, raw } = testDb();
    await placeOrder(db, {
      id: "ORDER00004",
      customerName: "Ada",
      customerEmail: "ada@example.com",
      totalCents: 3499,
      lines: [{ productId: "USB-C 65W", name: "Charger", unitPriceCents: 3499, quantity: 1 }],
    });
    const electronics = (await departmentSummary(db)).find((row) => row.name === "Electronics");
    expect(electronics?.sales_cents).toBe(3499);
    expect(electronics?.profit_cents).toBe(3499 - 1000000);
    // Nothing about profit is written to any table.
    const columns = raw.query("PRAGMA table_info(departments)").all() as { name: string }[];
    expect(columns.map((c) => c.name)).not.toContain("profit");
  });

  test("overhead and departments can be set and created, with names kept unique", async () => {
    const { db } = testDb();
    expect(await setOverhead(db, 2, 300000)).toBe(true);
    expect((await departmentSummary(db)).find((row) => row.id === 2)?.overhead_cents).toBe(300000);
    await addDepartment(db, "Garden", 0);
    await expect(addDepartment(db, "Garden", 0)).rejects.toThrow(/UNIQUE/);
  });
});
