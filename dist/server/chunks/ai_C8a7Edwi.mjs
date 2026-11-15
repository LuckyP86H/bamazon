globalThis.process ??= {};
globalThis.process.env ??= {};
// src/lib/ai.ts
var FALLBACK_ORIGIN = { source: "fallback" };
var TIMEOUT_MS = 8e3;
/** Builds a config from env, or null when no provider is configured. */
function aiConfig(env) {
	const baseUrl = env.AI_BASE_URL?.trim().replace(/\/$/, "");
	const model = env.AI_MODEL?.trim();
	if (!baseUrl || !model) return null;
	const apiKey = env.AI_API_KEY?.trim();
	return {
		provider: env.AI_PROVIDER?.trim() || "custom",
		baseUrl,
		model,
		...apiKey ? { apiKey } : {}
	};
}
/**
* One chat completion. Returns the message text. Throws on any failure — callers
* treat a throw as "the LLM didn't answer" and fall back.
*/
async function chatText(config, messages, fetchFn = fetch, timeoutMs = TIMEOUT_MS) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				...config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}
			},
			body: JSON.stringify({
				model: config.model,
				messages,
				temperature: 0
			}),
			signal: controller.signal
		});
		if (!response.ok) throw new Error(`AI provider answered HTTP ${response.status}`);
		const content = (await response.json()).choices?.[0]?.message?.content;
		if (typeof content !== "string" || content.trim() === "") throw new Error("AI provider returned no message text");
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
function extractJson(text) {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end <= start) throw new Error("no JSON object in model output");
	return JSON.parse(text.slice(start, end + 1));
}
/** A chat completion that must come back as a JSON object. Throws on any failure. */
async function chatJson(config, messages, fetchFn = fetch) {
	return extractJson(await chatText(config, messages, fetchFn));
}
export { aiConfig as n, chatJson as r, FALLBACK_ORIGIN as t };

//# sourceMappingURL=ai_C8a7Edwi.mjs.map