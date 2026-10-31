import { z } from "zod";
import { MAX_QUANTITY } from "./cart";
import { parseDollarsToCents } from "./money";

/** Form fields arrive as strings. Each schema says exactly what a valid value looks like. */

const text = (max: number) => z.string().trim().min(1).max(max);

export const checkoutForm = z.object({
  name: text(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});

export const quantityField = z.coerce.number().int().min(0).max(MAX_QUANTITY);

export const restockForm = z.object({
  productId: text(30),
  delta: z.coerce
    .number()
    .int()
    .min(-10_000)
    .max(10_000)
    .refine((value) => value !== 0, "Enter a non-zero amount"),
});

export const newProductForm = z.object({
  id: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9 _-]{1,29}$/, "SKU: 2 to 30 letters, numbers, spaces, - or _"),
  name: text(120),
  description: z.string().trim().max(1000),
  emoji: z.string().trim().min(1).max(8),
  departmentId: z.coerce.number().int().positive(),
  priceCents: z.string().transform((value, ctx) => {
    const cents = parseDollarsToCents(value);
    if (cents === null) ctx.addIssue({ code: "custom", message: "Enter a price like 12.50" });
    return cents ?? 0;
  }),
  stock: z.coerce.number().int().min(0).max(100_000),
});

export const priceForm = z.object({
  productId: text(30),
  priceCents: z.string().transform((value, ctx) => {
    const cents = parseDollarsToCents(value);
    if (cents === null) ctx.addIssue({ code: "custom", message: "Enter a price like 12.50" });
    return cents ?? 0;
  }),
});

export const departmentForm = z.object({
  name: text(60),
  overheadCents: z.string().transform((value, ctx) => {
    const cents = parseDollarsToCents(value);
    if (cents === null) ctx.addIssue({ code: "custom", message: "Enter an overhead like 10000" });
    return cents ?? 0;
  }),
});

export const overheadForm = z.object({
  departmentId: z.coerce.number().int().positive(),
  overheadCents: z.string().transform((value, ctx) => {
    const cents = parseDollarsToCents(value);
    if (cents === null) ctx.addIssue({ code: "custom", message: "Enter an overhead like 10000" });
    return cents ?? 0;
  }),
});

/** Reads a form, or returns the first problem as a message for the user. */
export function readForm<T extends z.ZodType>(schema: T, data: FormData | Record<string, unknown>) {
  const input = data instanceof FormData ? Object.fromEntries(data) : data;
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true as const, data: parsed.data as z.output<T> };
  return {
    ok: false as const,
    message: parsed.error.issues[0]?.message ?? "Please check the form",
  };
}
