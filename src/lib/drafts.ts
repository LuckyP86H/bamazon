/**
 * Product-description drafts for the back office.
 *
 * A manager types a name and picks a department; this module drafts the description
 * (and an emoji) for the add-product form. The draft is text in a form field —
 * nothing is saved until the manager edits it and submits the usual product form,
 * which validates everything exactly as before.
 *
 * With an LLM configured, the model writes the draft. Without one — or on any
 * provider failure — a plain template draft answers instead, and the origin says
 * which happened so the UI can label it.
 */
import { z } from "zod";
import { FALLBACK_ORIGIN, aiConfig, chatJson, type AiEnv, type AiOrigin, type FetchFn } from "./ai";

export interface DescriptionDraft {
  description: string;
  emoji: string;
  origin: AiOrigin;
}

const draftShape = z.object({
  description: z.string().trim().min(1).max(1000),
  emoji: z.string().trim().min(1).max(8),
});

const EMOJI_BY_DEPARTMENT: [RegExp, string][] = [
  [/electronic/i, "🔌"],
  [/book/i, "📚"],
  [/cloth|apparel/i, "👕"],
  [/kitchen|home/i, "🍳"],
  [/sport|outdoor/i, "🏅"],
];

/** The template draft's emoji: a fixed pick from the department name. */
export function templateEmoji(department: string): string {
  return EMOJI_BY_DEPARTMENT.find(([pattern]) => pattern.test(department))?.[1] ?? "📦";
}

/**
 * The deterministic draft. It reads like what it is — a skeleton for the manager
 * to rewrite — and the back office labels it as a template when it appears.
 */
export function templateDraft(name: string, department: string): DescriptionDraft {
  return {
    description:
      `${name} — new to our ${department} department. ` +
      "Say what it is, who it is for, and one or two details a shopper would want to know.",
    emoji: templateEmoji(department),
    origin: FALLBACK_ORIGIN,
  };
}

/** Drafts a description for a product the manager is about to add. Never throws. */
export async function draftDescription(
  env: AiEnv,
  input: { name: string; department: string },
  fetchFn: FetchFn = fetch,
): Promise<DescriptionDraft> {
  const config = aiConfig(env);
  if (config) {
    try {
      const raw = await chatJson(
        config,
        [
          {
            role: "system",
            content:
              "You draft catalogue copy for a store. Reply with ONLY a JSON object: " +
              '"description" (one or two plain sentences, at most 220 characters, no prices, ' +
              'no invented specifications) and "emoji" (one emoji that fits the product).',
          },
          {
            role: "user",
            content: `Product name: ${input.name}\nDepartment: ${input.department}`,
          },
        ],
        fetchFn,
      );
      const parsed = draftShape.parse(raw);
      return {
        description: parsed.description,
        emoji: parsed.emoji,
        origin: { source: "llm", provider: config.provider, model: config.model },
      };
    } catch {
      // Any provider or validation failure falls through to the template draft.
    }
  }
  return templateDraft(input.name, input.department);
}
