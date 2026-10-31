import type { APIRoute } from "astro";
import { CART_COOKIE, decodeCart } from "../../lib/cart";
import { checkout, newOrderId } from "../../lib/checkout";
import { failure } from "../../lib/http";
import { db } from "../../lib/runtime";
import { checkoutForm, readForm } from "../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const parsed = readForm(checkoutForm, form);
  if (!parsed.ok) return redirect(failure("/checkout", parsed.message), 303);

  const items = decodeCart(cookies.get(CART_COOKIE)?.value);
  const result = await checkout(db(), items, parsed.data, newOrderId());
  if (!result.ok) return redirect(failure("/checkout", result.message), 303);

  cookies.delete(CART_COOKIE, { path: "/" });
  return redirect(`/orders/${result.orderId}`, 303);
};
