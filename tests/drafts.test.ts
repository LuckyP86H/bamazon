import { describe, expect, test } from "bun:test";
import type { AiEnv } from "../src/lib/ai";
import { draftDescription, templateDraft, templateEmoji } from "../src/lib/drafts";

const env: AiEnv = {
  AI_PROVIDER: "Fixture",
  AI_BASE_URL: "https://fixture.test/v1",
  AI_MODEL: "fixture-1",
};

const fetchReturning = (content: string, status = 200) =>
  (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status,
    })) as unknown as typeof fetch;

describe("templateDraft", () => {
  test("no provider configured: a labelled skeleton with a department emoji", async () => {
    const draft = await draftDescription(
      {},
      { name: "Trail Shoes", department: "Sports & Outdoors" },
    );
    expect(draft.origin).toEqual({ source: "fallback" });
    expect(draft.description).toContain("Trail Shoes");
    expect(draft.description).toContain("Sports & Outdoors");
    expect(draft.emoji).toBe("🏅");
  });

  test("the template emoji follows the department", () => {
    expect(templateEmoji("Electronics")).toBe("🔌");
    expect(templateEmoji("Books")).toBe("📚");
    expect(templateEmoji("Clothing")).toBe("👕");
    expect(templateEmoji("Home & Kitchen")).toBe("🍳");
    expect(templateEmoji("Garden")).toBe("📦");
    expect(templateDraft("Mug", "Books").emoji).toBe("📚");
  });
});

describe("draftDescription with a provider", () => {
  test("a well-formed model answer is used verbatim and labelled llm", async () => {
    const fetchFn = fetchReturning(
      JSON.stringify({ description: "A grippy mat for morning stretches.", emoji: "🧘" }),
    );
    const draft = await draftDescription(
      env,
      { name: "Yoga Mat", department: "Sports & Outdoors" },
      fetchFn,
    );
    expect(draft).toEqual({
      description: "A grippy mat for morning stretches.",
      emoji: "🧘",
      origin: { source: "llm", provider: "Fixture", model: "fixture-1" },
    });
  });

  test("a provider failure falls back to the template", async () => {
    const draft = await draftDescription(
      env,
      { name: "Yoga Mat", department: "Sports & Outdoors" },
      fetchReturning("down", 500),
    );
    expect(draft.origin).toEqual({ source: "fallback" });
    expect(draft.description).toContain("Yoga Mat");
  });

  test("an unusable model answer (over-long, wrong shape) falls back to the template", async () => {
    const fetchFn = fetchReturning(JSON.stringify({ description: "x".repeat(1500), emoji: "🧘" }));
    const draft = await draftDescription(
      env,
      { name: "Yoga Mat", department: "Sports & Outdoors" },
      fetchFn,
    );
    expect(draft.origin).toEqual({ source: "fallback" });
  });
});
