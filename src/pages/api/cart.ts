import type { APIRoute } from "astro";
import { z } from "zod";
import {
  CART_COOKIE,
  addToCart,
  cartCount,
  decodeCart,
  encodeCart,
  setQuantity,
} from "../../lib/cart";
import { getProduct } from "../../lib/db";
import { failure, notice, safeBack } from "../../lib/http";
import { db } from "../../lib/runtime";
import { quantityField, readForm } from "../../lib/validation";

const body = z.object({
  productId: z.string().trim().min(1).max(30),
  quantity: quantityField.default(0),
});

// Every cart change goes through here so the cookie only ever holds products that exist.
export const POST: APIRoute = async ({ request, cookies, url, redirect }) => {
  const form = await request.formData();
  const back = safeBack(form.get("back"), "/cart");
  const intent = String(form.get("intent") ?? "");
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
  };

  let items = decodeCart(cookies.get(CART_COOKIE)?.value);
  let message: string | null = null;

  if (intent === "clear") {
    items = {};
    message = "Your cart is empty.";
  } else {
    const parsed = readForm(body, form);
    if (!parsed.ok) return redirect(failure(back, parsed.message), 303);
    const { productId, quantity } = parsed.data;

    if (intent === "remove") {
      items = setQuantity(items, productId, 0);
      message = "Removed from your cart.";
    } else if (intent === "set") {
      items = setQuantity(items, productId, quantity);
      message = quantity === 0 ? "Removed from your cart." : "Cart updated.";
    } else if (intent === "add") {
      const product = await getProduct(db(), productId);
      if (!product || !product.active)
        return redirect(failure(back, "That product is no longer sold."), 303);
      if (product.stock <= 0) return redirect(failure(back, `${product.name} is sold out.`), 303);
      if (quantity < 1) return redirect(failure(back, "Choose at least one."), 303);

      const wanted = addToCart(items, productId, quantity);
      const capped = Math.min(wanted[productId] ?? 0, product.stock);
      items = { ...wanted, [productId]: capped };
      message =
        capped < (wanted[productId] ?? 0)
          ? `Added. Only ${product.stock} of ${product.name} are in stock, so that's the most we could add.`
          : `Added ${product.name} to your cart.`;
    } else {
      return redirect(failure(back, "Unknown cart action."), 303);
    }
  }

  if (cartCount(items) === 0) cookies.delete(CART_COOKIE, { path: "/" });
  else cookies.set(CART_COOKIE, encodeCart(items), cookieOptions);
  return redirect(notice(back, message ?? "Cart updated."), 303);
};
