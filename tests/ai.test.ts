import { describe, expect, test } from "bun:test";
import { aiConfig, chatJson, chatText, extractJson, type AiConfig } from "../src/lib/ai";

const config: AiConfig = {
  provider: "Fixture",
  baseUrl: "https://fixture.test/v1",
  model: "fixture-1",
};

type FetchStub = (
  url: unknown,
  init?: { body?: string; headers?: Record<string, string> },
) => Promise<Response>;

const asFetch = (stub: FetchStub) => stub as unknown as typeof fetch;

const completion = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

describe("aiConfig", () => {
  test("no base URL or model means no provider", () => {
    expect(aiConfig({})).toBeNull();
    expect(aiConfig({ AI_BASE_URL: "https://x.test/v1" })).toBeNull();
    expect(aiConfig({ AI_MODEL: "m" })).toBeNull();
  });

  test("a full env builds a config; the key and the name are optional", () => {
    expect(aiConfig({ AI_BASE_URL: "https://x.test/v1/", AI_MODEL: "m" })).toEqual({
      provider: "custom",
      baseUrl: "https://x.test/v1",
      model: "m",
    });
    expect(
      aiConfig({
        AI_BASE_URL: "http://localhost:11434/v1",
        AI_MODEL: "llama",
        AI_PROVIDER: "Ollama",
      }),
    ).toEqual({ provider: "Ollama", baseUrl: "http://localhost:11434/v1", model: "llama" });
  });
});

describe("chatText", () => {
  test("posts an OpenAI-shaped request and returns the message text", async () => {
    let seenUrl = "";
    let seenBody: { model?: string; messages?: unknown } = {};
    let seenAuth = "";
    const fetchFn = asFetch(async (url, init) => {
      seenUrl = String(url);
      seenBody = JSON.parse(init?.body ?? "{}") as typeof seenBody;
      seenAuth = init?.headers?.authorization ?? "";
      return completion("hello");
    });
    const text = await chatText(
      { ...config, apiKey: "secret" },
      [{ role: "user", content: "hi" }],
      fetchFn,
    );
    expect(text).toBe("hello");
    expect(seenUrl).toBe("https://fixture.test/v1/chat/completions");
    expect(seenBody.model).toBe("fixture-1");
    expect(seenAuth).toBe("Bearer secret");
  });

  test("an HTTP error throws, so features can fall back", async () => {
    const fetchFn = asFetch(async () => new Response("nope", { status: 500 }));
    await expect(chatText(config, [{ role: "user", content: "hi" }], fetchFn)).rejects.toThrow(
      "500",
    );
  });

  test("an empty or missing message throws", async () => {
    const noChoices = asFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
    await expect(chatText(config, [{ role: "user", content: "hi" }], noChoices)).rejects.toThrow();
    const blank = asFetch(async () => completion("   "));
    await expect(chatText(config, [{ role: "user", content: "hi" }], blank)).rejects.toThrow();
  });
});

describe("extractJson / chatJson", () => {
  test("finds the object inside fences and prose", () => {
    expect(extractJson('Here you go:\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson('{"a": 1} hope that helps')).toEqual({ a: 1 });
  });

  test("throws when there is no JSON object", () => {
    expect(() => extractJson("no json here")).toThrow();
    expect(() => extractJson("[1, 2]")).toThrow();
  });

  test("chatJson parses a completion end to end", async () => {
    const fetchFn = asFetch(async () => completion('{"maxPriceCents": 5000}'));
    await expect(chatJson(config, [{ role: "user", content: "x" }], fetchFn)).resolves.toEqual({
      maxPriceCents: 5000,
    });
  });
});
