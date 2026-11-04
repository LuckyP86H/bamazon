import { describe, expect, test } from "bun:test";
import { DemoJev, TypesafeJev, judgeWithFallback, type JudgeQuestion } from "../src/lib/judge";

const questions: Record<string, JudgeQuestion> = {
  urgency: {
    type: "score",
    instructions: "Rate the restock urgency.",
    criteria: ["plenty", "healthy", "watch", "urgent", "critical"],
  },
  gate: { type: "noul", instructions: "This should be approved." },
};

describe("DemoJev", () => {
  test("turns the state's signals into typed answers, deterministically", async () => {
    const demo = new DemoJev();
    expect(demo.kind).toBe("demo");
    const state = { urgency: 0.8, gate: 0.9 };
    const first = await demo.evaluate(state, questions);
    const second = await demo.evaluate(state, questions);
    expect(first).toEqual(second);
    expect(first.gate).toEqual({ type: "noul", noul: 0.9 });
    const score = first.urgency;
    expect(score?.type).toBe("score");
    if (score?.type === "score") {
      expect(score.score).toBeCloseTo(3.2);
      expect(score.confidence).toBe(0.6);
    }
  });

  test("missing signals read as neutral", async () => {
    const answers = await new DemoJev().evaluate({}, questions);
    expect(answers.gate).toEqual({ type: "noul", noul: 0.5 });
  });
});

describe("judgeWithFallback", () => {
  test("no key: the demo judge answers and says so", async () => {
    const { answers, judge } = await judgeWithFallback({}, { urgency: 1, gate: 1 }, questions);
    expect(judge).toBe("demo");
    expect(answers.gate).toEqual({ type: "noul", noul: 1 });
  });

  test("a key plus a healthy API: the real judge answers", async () => {
    let seenUrl = "";
    let seenAuth = "";
    const fetchFn = (async (url: unknown, init?: { headers?: Record<string, string> }) => {
      seenUrl = String(url);
      seenAuth = init?.headers?.authorization ?? "";
      return new Response(
        JSON.stringify({
          answers: {
            urgency: { score: 4, probabilities: { "4": 0.9 }, confidence: 0.87 },
            gate: { noul: 0.93 },
          },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const { answers, judge } = await judgeWithFallback(
      { TYPESAFE_API_KEY: "test-key" },
      { product: "Widget" },
      questions,
      fetchFn,
    );
    expect(judge).toBe("typesafe");
    expect(seenUrl).toBe("https://api.typesafe.ai/v1/systemone");
    expect(seenAuth).toBe("Bearer test-key");
    expect(answers.gate).toEqual({ type: "noul", noul: 0.93 });
    const urgency = answers.urgency;
    expect(urgency?.type).toBe("score");
    if (urgency?.type === "score") {
      expect(urgency.score).toBe(4);
      expect(urgency.confidence).toBe(0.87);
    }
  });

  test("out-of-range answers are clamped, not trusted", async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify({ answers: { urgency: { score: 99 }, gate: { noul: 1.7 } } }), {
        status: 200,
      })) as unknown as typeof fetch;
    const { answers } = await judgeWithFallback({ TYPESAFE_API_KEY: "k" }, {}, questions, fetchFn);
    expect(answers.gate).toEqual({ type: "noul", noul: 1 });
    const urgency = answers.urgency;
    if (urgency?.type === "score") expect(urgency.score).toBe(4);
  });

  test("a failing API falls back to the demo judge", async () => {
    const fetchFn = (async () => new Response("down", { status: 500 })) as unknown as typeof fetch;
    const { judge } = await judgeWithFallback(
      { TYPESAFE_API_KEY: "k" },
      { urgency: 0.5, gate: 0.5 },
      questions,
      fetchFn,
    );
    expect(judge).toBe("demo");
  });

  test("a malformed answer (missing noul) falls back to the demo judge", async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify({ answers: { urgency: { score: 2 }, gate: {} } }), {
        status: 200,
      })) as unknown as typeof fetch;
    const { judge } = await judgeWithFallback(
      { TYPESAFE_API_KEY: "k" },
      { urgency: 0.5, gate: 0.5 },
      questions,
      fetchFn,
    );
    expect(judge).toBe("demo");
  });
});

describe("TypesafeJev", () => {
  test("honours a custom base URL and model", async () => {
    let seenUrl = "";
    let seenModel = "";
    const fetchFn = (async (url: unknown, init?: { body?: string }) => {
      seenUrl = String(url);
      seenModel = (JSON.parse(init?.body ?? "{}") as { model?: string }).model ?? "";
      return new Response(JSON.stringify({ answers: { gate: { noul: 0.1 } } }), { status: 200 });
    }) as unknown as typeof fetch;
    const client = new TypesafeJev({
      apiKey: "k",
      baseUrl: "https://judge.example.test/",
      model: "jev-test",
      fetchFn,
    });
    await client.evaluate({}, { gate: questions.gate as JudgeQuestion });
    expect(seenUrl).toBe("https://judge.example.test/v1/systemone");
    expect(seenModel).toBe("jev-test");
  });
});
