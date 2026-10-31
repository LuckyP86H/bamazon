import { describe, expect, test } from "bun:test";
import {
  checkoutForm,
  newProductForm,
  priceForm,
  readForm,
  restockForm,
} from "../src/lib/validation";
import { failure, notice, safeBack, withParams } from "../src/lib/http";

describe("form validation", () => {
  test("checkout needs a name and a real-looking email, normalised", () => {
    const ok = readForm(checkoutForm, { name: " Ada Lovelace ", email: "Ada@Example.COM" });
    expect(ok).toMatchObject({
      ok: true,
      data: { name: "Ada Lovelace", email: "ada@example.com" },
    });
    expect(readForm(checkoutForm, { name: "", email: "ada@example.com" }).ok).toBe(false);
    expect(readForm(checkoutForm, { name: "Ada", email: "not-an-email" }).ok).toBe(false);
  });

  test("restock must be a non-zero whole number", () => {
    expect(readForm(restockForm, { productId: "A", delta: "10" }).ok).toBe(true);
    expect(readForm(restockForm, { productId: "A", delta: "0" }).ok).toBe(false);
    expect(readForm(restockForm, { productId: "A", delta: "1.5" }).ok).toBe(false);
  });

  test("prices are read as dollars and stored as cents", () => {
    expect(readForm(priceForm, { productId: "A", priceCents: "12.50" })).toMatchObject({
      ok: true,
      data: { priceCents: 1250 },
    });
    expect(readForm(priceForm, { productId: "A", priceCents: "twelve" }).ok).toBe(false);
  });

  test("a new SKU is uppercased and limited to safe characters", () => {
    const ok = readForm(newProductForm, {
      id: "boo new01",
      name: "Notebook",
      description: "",
      emoji: "📓",
      departmentId: "2",
      priceCents: "9.99",
      stock: "4",
    });
    expect(ok).toMatchObject({ ok: true, data: { id: "BOO NEW01", priceCents: 999, stock: 4 } });
    expect(
      readForm(newProductForm, {
        id: "<script>",
        name: "x",
        description: "",
        emoji: "x",
        departmentId: "1",
        priceCents: "1",
        stock: "1",
      }).ok,
    ).toBe(false);
  });
});

describe("redirect helpers", () => {
  test("only same-site paths are accepted as a way back", () => {
    expect(safeBack("/cart")).toBe("/cart");
    expect(safeBack("https://evil.example")).toBe("/");
    expect(safeBack("//evil.example")).toBe("/");
    expect(safeBack(null, "/manage")).toBe("/manage");
  });

  test("messages are added to the query string, keeping existing params", () => {
    expect(notice("/?q=book", "Added")).toBe("/?q=book&notice=Added");
    expect(failure("/cart", "Nope")).toBe("/cart?error=Nope");
    expect(withParams("/a?x=1&x=2", { y: "3" })).toBe("/a?x=1&x=2&y=3");
  });
});
