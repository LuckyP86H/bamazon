/**
 * A small, provider-agnostic LLM adapter.
 *
 * One operation — chat completion — over the OpenAI-compatible wire shape
 * (`POST /chat/completions`), so any provider that speaks it works by configuration
 * alone: Ollama Cloud, OpenAI, Groq, Together, a local Ollama, and so on. Nothing in
 * this module knows a vendor's name; `AI_PROVIDER` is only a label the UI shows.
 *
 * Configuration is env-only (see the README's AI section):
 *   AI_BASE_URL — e.g. https://ollama.com/v1 or http://localhost:11434/v1
 *   AI_MODEL    — the provider's model name
 *   AI_API_KEY  — optional; a local provider needs none
 *   AI_PROVIDER — optional display name, defaults to "custom"
 *
 * Failure contract: every problem — not configured, network error, timeout, HTTP
 * error, malformed response — makes the call throw, and each feature catches that
 * and answers with its deterministic fallback instead. A shopper or a manager never
 * sees a provider failure as a 500.
 */

export interface AiEnv {
  AI_PROVIDER?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI_API_KEY?: string;
}

export interface AiConfig {
  /** Display name only (the UI says "Answered by <provider>"). */
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

/** Where an AI-flavoured answer actually came from. Features surface this in the UI. */
export type AiOrigin = { source: "llm"; provider: string; model: string } | { source: "fallback" };

export const FALLBACK_ORIGIN: AiOrigin = { source: "fallback" };

export type FetchFn = typeof fetch;

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const TIMEOUT_MS = 8_000;

/** Builds a config from env, or null when no provider is configured. */
export function aiConfig(env: AiEnv): AiConfig | null {
  const baseUrl = env.AI_BASE_URL?.trim().replace(/\/$/, "");
  const model = env.AI_MODEL?.trim();
  if (!baseUrl || !model) return null;
  const apiKey = env.AI_API_KEY?.trim();
  return {
    provider: env.AI_PROVIDER?.trim() || "custom",
    baseUrl,
    model,
    ...(apiKey ? { apiKey } : {}),
  };
}

/**
 * One chat completion. Returns the message text. Throws on any failure — callers
 * treat a throw as "the LLM didn't answer" and fall back.
 */
export async function chatText(
  config: AiConfig,
  messages: ChatMessage[],
  fetchFn: FetchFn = fetch,
  timeoutMs = TIMEOUT_MS,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: config.model, messages, temperature: 0 }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI provider answered HTTP ${response.status}`);
    const data = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "")
      throw new Error("AI provider returned no message text");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pulls a JSON value out of model text. Models wrap JSON in code fences or prose
 * often enough that the first `{` to the last `}` is the reliable slice. Throws
 * when there is no JSON object to find.
 */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}

/** A chat completion that must come back as a JSON object. Throws on any failure. */
export async function chatJson(
  config: AiConfig,
  messages: ChatMessage[],
  fetchFn: FetchFn = fetch,
): Promise<unknown> {
  return extractJson(await chatText(config, messages, fetchFn));
}
