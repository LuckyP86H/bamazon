/**
 * Jev by TypeSafe — a "System One" JUDGMENT model (docs.typesafe.ai).
 *
 * Jev does not generate text. Each call sends a `state` plus typed questions and
 * returns calibrated, typed answers. This module uses two of its primitives:
 *   - Score: position on a rubric  -> { score, probabilities, confidence }
 *   - Noul:  probability a statement is true -> { noul } in 0..1
 *
 * Following the pattern the clicky-game rebuild established:
 *   - TypesafeJev: the real REST client (POST /v1/systemone, Bearer key), enabled
 *     by TYPESAFE_API_KEY. No key is ever hard-coded.
 *   - DemoJev: a deterministic stand-in used when no key is set (or when the real
 *     API fails). It reads the numeric signals the merchandising module computed
 *     and turns them into scores and gate probabilities. It is ALWAYS labelled
 *     "demo" — its answers are arithmetic, not model judgments.
 *   - judgeWithFallback: tries the real model first and reports honestly which
 *     judge actually answered (`kind`).
 */

export type JudgeQuestion =
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } }
  | { type: "score"; instructions: string; criteria: string[] };

type JudgeAnswer =
  | { type: "noul"; noul: number }
  | { type: "score"; score: number; probabilities: Record<string, number>; confidence: number };

export type JudgeAnswers = Record<string, JudgeAnswer>;

interface JudgeClient {
  readonly kind: "typesafe" | "demo";
  evaluate(state: unknown, questions: Record<string, JudgeQuestion>): Promise<JudgeAnswers>;
}

export interface JudgeEnv {
  TYPESAFE_API_KEY?: string;
  TYPESAFE_BASE_URL?: string;
  TYPESAFE_MODEL?: string;
}

type FetchFn = typeof fetch;

const DEFAULT_BASE_URL = "https://api.typesafe.ai";
const DEFAULT_MODEL = "jev-latest";
const TIMEOUT_MS = 10_000;

export class TypesafeJev implements JudgeClient {
  readonly kind = "typesafe" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchFn: FetchFn;

  constructor(opts: { apiKey: string; baseUrl?: string; model?: string; fetchFn?: FetchFn }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.model = opts.model ?? DEFAULT_MODEL;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  async evaluate(state: unknown, questions: Record<string, JudgeQuestion>): Promise<JudgeAnswers> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetchFn(`${this.baseUrl}/v1/systemone`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: this.model, state, questions }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`typesafe http ${response.status}`);
      const data = (await response.json()) as { answers?: Record<string, unknown> };
      if (!data.answers || typeof data.answers !== "object")
        throw new Error("typesafe response missing answers");
      const out: JudgeAnswers = {};
      for (const [id, question] of Object.entries(questions))
        out[id] = parseAnswer(id, question, data.answers[id]);
      return out;
    } finally {
      clearTimeout(timer);
    }
  }
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Defensive parsing: a malformed answer is an error, never a silent guess. */
function parseAnswer(id: string, question: JudgeQuestion, raw: unknown): JudgeAnswer {
  if (!raw || typeof raw !== "object") throw new Error(`typesafe answer ${id} missing`);
  const answer = raw as Record<string, unknown>;
  if (question.type === "noul") {
    const probability = num(answer.noul);
    if (probability === null) throw new Error(`typesafe answer ${id} missing noul`);
    return { type: "noul", noul: Math.min(1, Math.max(0, probability)) };
  }
  const levels = question.criteria.length;
  const score = num(answer.score);
  if (score === null) throw new Error(`typesafe answer ${id} missing score`);
  const rawProbabilities = (answer.probabilities ?? {}) as Record<string, unknown>;
  const probabilities: Record<string, number> = {};
  for (let level = 0; level < levels; level++)
    probabilities[String(level)] = num(rawProbabilities[String(level)]) ?? 0;
  return {
    type: "score",
    score: Math.min(levels - 1, Math.max(0, score)),
    probabilities,
    confidence: num(answer.confidence) ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* DemoJev — deterministic signals in, typed answers out. Labelled.    */
/* ------------------------------------------------------------------ */

/** Reads a 0..1 signal the merchandising module put in the state, or a neutral 0.5. */
function signal(state: unknown, key: string): number {
  if (state && typeof state === "object") {
    const value = (state as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) return Math.min(1, Math.max(0, value));
  }
  return 0.5;
}

export class DemoJev implements JudgeClient {
  readonly kind = "demo" as const;

  async evaluate(state: unknown, questions: Record<string, JudgeQuestion>): Promise<JudgeAnswers> {
    const out: JudgeAnswers = {};
    for (const [id, question] of Object.entries(questions)) {
      if (question.type === "noul") {
        out[id] = { type: "noul", noul: signal(state, "gate") };
        continue;
      }
      const levels = question.criteria.length;
      const score = signal(state, "urgency") * (levels - 1);
      const probabilities: Record<string, number> = {};
      for (let level = 0; level < levels; level++)
        probabilities[String(level)] = Math.max(0.02, 1 - Math.abs(level - score) / levels);
      const total = Object.values(probabilities).reduce((sum, value) => sum + value, 0) || 1;
      for (const key of Object.keys(probabilities))
        probabilities[key] = (probabilities[key] ?? 0) / total;
      out[id] = { type: "score", score, probabilities, confidence: 0.6 };
    }
    return out;
  }
}

/* ------------------------------------------------------------------ */

export interface JudgedResult {
  answers: JudgeAnswers;
  /** Which judge ACTUALLY answered: "typesafe" or "demo". */
  judge: "typesafe" | "demo";
}

/**
 * Asks Jev (real when TYPESAFE_API_KEY is set), falling back to the demo judge on
 * ANY failure — missing key, HTTP error, malformed response. The returned `judge`
 * always names the judge that produced the answers.
 */
export async function judgeWithFallback(
  env: JudgeEnv,
  state: unknown,
  questions: Record<string, JudgeQuestion>,
  fetchFn: FetchFn = fetch,
): Promise<JudgedResult> {
  const apiKey = env.TYPESAFE_API_KEY?.trim();
  if (apiKey) {
    try {
      const client = new TypesafeJev({
        apiKey,
        fetchFn,
        ...(env.TYPESAFE_BASE_URL ? { baseUrl: env.TYPESAFE_BASE_URL } : {}),
        ...(env.TYPESAFE_MODEL ? { model: env.TYPESAFE_MODEL } : {}),
      });
      return { answers: await client.evaluate(state, questions), judge: "typesafe" };
    } catch {
      // Fall through to the demo judge — labelled as such by the caller.
    }
  }
  const demo = new DemoJev();
  return { answers: await demo.evaluate(state, questions), judge: "demo" };
}
