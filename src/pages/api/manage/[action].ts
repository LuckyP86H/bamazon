import type { APIRoute } from "astro";
import { z } from "zod";
import { STAFF_COOKIE, currentStaff } from "../../../lib/auth";
import {
  addDepartment,
  addProduct,
  adjustStock,
  featureProduct,
  listDepartments,
  setActive,
  setOverhead,
  setPrice,
} from "../../../lib/db";
import { draftDescription } from "../../../lib/drafts";
import { failure, notice, safeBack, withParams } from "../../../lib/http";
import { bindings, db as database } from "../../../lib/runtime";
import {
  departmentForm,
  draftForm,
  newProductForm,
  overheadForm,
  priceForm,
  readForm,
  restockForm,
} from "../../../lib/validation";

const listingForm = z.object({
  productId: z.string().trim().min(1).max(30),
  active: z.enum(["0", "1"]),
});

const featureForm = z.object({
  productId: z.string().trim().min(1).max(30),
});

// One endpoint for every back-office change. Each action runs the same staff check first.
export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const form = await request.formData();
  const back = safeBack(form.get("back"), "/manage");
  const staff = await currentStaff(database(), cookies.get(STAFF_COOKIE)?.value);
  if (!staff) return redirect(failure("/login", "Please sign in to continue."), 303);

  const conn = database();
  const fail = (message: string) => redirect(failure(back, message), 303);
  const done = (message: string) => redirect(notice(back, message), 303);

  switch (params.action) {
    case "restock": {
      const parsed = readForm(restockForm, form);
      if (!parsed.ok) return fail(parsed.message);
      const ok = await adjustStock(conn, parsed.data.productId, parsed.data.delta);
      return ok
        ? done("Stock updated.")
        : fail("Couldn't update stock. Stock can't go below zero.");
    }
    case "price": {
      const parsed = readForm(priceForm, form);
      if (!parsed.ok) return fail(parsed.message);
      const ok = await setPrice(conn, parsed.data.productId, parsed.data.priceCents);
      return ok ? done("Price saved.") : fail("That product doesn't exist.");
    }
    case "listing": {
      const parsed = readForm(listingForm, form);
      if (!parsed.ok) return fail(parsed.message);
      const active = parsed.data.active === "1";
      const ok = await setActive(conn, parsed.data.productId, active);
      return ok
        ? done(active ? "Now showing in the shop." : "Hidden from the shop.")
        : fail("That product doesn't exist.");
    }
    case "product": {
      const parsed = readForm(newProductForm, form);
      if (!parsed.ok) return fail(parsed.message);
      const departments = await listDepartments(conn);
      if (!departments.some((department) => department.id === parsed.data.departmentId))
        return fail("That department doesn't exist.");
      try {
        await addProduct(conn, {
          id: parsed.data.id,
          name: parsed.data.name,
          description: parsed.data.description,
          emoji: parsed.data.emoji,
          departmentId: parsed.data.departmentId,
          priceCents: parsed.data.priceCents,
          stock: parsed.data.stock,
        });
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          return fail(`SKU ${parsed.data.id} is already in use.`);
        throw error;
      }
      return done(`Added ${parsed.data.name}.`);
    }
    case "feature": {
      const parsed = readForm(featureForm, form);
      if (!parsed.ok) return fail(parsed.message);
      const ok = await featureProduct(conn, parsed.data.productId);
      return ok ? done("Featured as the deal of the day.") : fail("That product doesn't exist.");
    }
    case "draft": {
      const parsed = readForm(draftForm, form);
      if (!parsed.ok) return fail(parsed.message);
      const departments = await listDepartments(conn);
      const department = departments.find((entry) => entry.id === parsed.data.departmentId);
      if (!department) return fail("That department doesn't exist.");
      const draft = await draftDescription(bindings, {
        name: parsed.data.name,
        department: department.name,
      });
      // The draft travels back as form values, never as a saved product. The manager
      // edits it in the add-product form and saves through the usual "product" action.
      return redirect(
        withParams(back, {
          dname: parsed.data.name,
          ddept: String(department.id),
          ddesc: draft.description,
          demoji: draft.emoji,
          dsrc: draft.origin.source,
          ...(draft.origin.source === "llm"
            ? { dprov: `${draft.origin.provider} (${draft.origin.model})` }
            : {}),
        }),
        303,
      );
    }
    case "department": {
      const parsed = readForm(departmentForm, form);
      if (!parsed.ok) return fail(parsed.message);
      try {
        await addDepartment(conn, parsed.data.name, parsed.data.overheadCents);
      } catch (error) {
        if (String(error).includes("UNIQUE")) return fail(`${parsed.data.name} already exists.`);
        throw error;
      }
      return done(`Created ${parsed.data.name}.`);
    }
    case "overhead": {
      const parsed = readForm(overheadForm, form);
      if (!parsed.ok) return fail(parsed.message);
      const ok = await setOverhead(conn, parsed.data.departmentId, parsed.data.overheadCents);
      return ok ? done("Overhead saved.") : fail("That department doesn't exist.");
    }
    default:
      return new Response("Not found", { status: 404 });
  }
};
