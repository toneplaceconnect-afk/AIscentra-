// server/lib/openrouter.js
//
// Real OpenRouter calls. No mocks, no stubs — this hits the live
// OpenRouter API every time it's called. Used by all three roles
// (research / editor / assistant); the only thing that changes
// between them is which model(s) + prompt gets passed in.
//
// Free-tier models on OpenRouter get rate-limited under shared load
// (HTTP 429) more often than paid models. To make that survivable
// without manual retries, callOpenRouter accepts an optional list of
// fallback models — on a 429, it waits briefly and tries the next
// model in the list before giving up.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
  throw new Error(
    'Missing OPENROUTER_API_KEY in environment. ' +
    'Copy .env.example to .env and fill in your real OpenRouter key.'
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Single attempt against one specific model. Does not retry or
 * fall back — that's handled by callOpenRouter below.
 *
 * @returns {Promise<{content: string, promptTokens: number|null, completionTokens: number|null, raw: object}>}
 * @throws {Error & {status?: number}} on any non-2xx response. The
 *   thrown error carries a `.status` property so callers can tell a
 *   429 apart from other failures without re-parsing the message.
 */
async function callOpenRouterOnce({ model, systemPrompt, userPrompt, maxTokens }) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // Optional but recommended by OpenRouter for routing/analytics on their end
      'HTTP-Referer': 'https://aiscentra.com',
      'X-Title': 'AIscentra Backend',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const err = new Error(
      `OpenRouter request failed for model "${model}": ${response.status} ${response.statusText} — ${errorBody}`
    );
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(`OpenRouter response missing choices[0].message.content for model "${model}"`);
  }

  return {
    content,
    promptTokens: data?.usage?.prompt_tokens ?? null,
    completionTokens: data?.usage?.completion_tokens ?? null,
    raw: data,
  };
}

/**
 * Calls OpenRouter's chat completions endpoint, with automatic
 * fallback across multiple models on rate limit (429).
 *
 * @param {Object} params
 * @param {string|string[]} params.model - one model slug, or an array
 *   tried in order. Array form: the first model is preferred; later
 *   ones are only tried if an earlier one returns 429.
 * @param {string} params.systemPrompt - system role content
 * @param {string} params.userPrompt   - user role content (the actual task/input)
 * @param {number} [params.maxTokens]  - optional max_tokens override
 * @param {number} [params.retryDelayMs] - pause before trying the next
 *   fallback model after a 429 (default 2000ms)
 *
 * @returns {Promise<{content: string, promptTokens: number|null, completionTokens: number|null, raw: object, modelUsed: string}>}
 * @throws {Error} if every model in the list fails (429 or otherwise)
 */
async function callOpenRouter({ model, systemPrompt, userPrompt, maxTokens = 2000, retryDelayMs = 2000 }) {
  const models = Array.isArray(model) ? model : [model];
  if (models.length === 0) {
    throw new Error('callOpenRouter requires at least one model.');
  }

  let lastError;

  for (let i = 0; i < models.length; i++) {
    const currentModel = models[i];
    try {
      const result = await callOpenRouterOnce({ model: currentModel, systemPrompt, userPrompt, maxTokens });
      return { ...result, modelUsed: currentModel };
    } catch (err) {
      lastError = err;

      const isRateLimit = err.status === 429;
      const hasMoreFallbacks = i < models.length - 1;

      if (isRateLimit && hasMoreFallbacks) {
        console.warn(
          `[openrouter] "${currentModel}" rate-limited (429), falling back to "${models[i + 1]}" after ${retryDelayMs}ms`
        );
        await sleep(retryDelayMs);
        continue;
      }

      // Non-429 errors, or no fallbacks left — stop trying and surface it.
      throw err;
    }
  }

  // Unreachable in practice (the loop always returns or throws), but
  // keeps the function's contract explicit.
  throw lastError;
}

module.exports = { callOpenRouter };
