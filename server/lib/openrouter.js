// server/lib/openrouter.js
//
// Real OpenRouter calls. No mocks, no stubs — this hits the live
// OpenRouter API every time it's called. Used by all three roles
// (research / editor / assistant); the only thing that changes
// between them is which model + prompt gets passed in.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
  throw new Error(
    'Missing OPENROUTER_API_KEY in environment. ' +
    'Copy .env.example to .env and fill in your real OpenRouter key.'
  );
}

/**
 * Calls OpenRouter's chat completions endpoint.
 *
 * @param {Object} params
 * @param {string} params.model      - OpenRouter model slug, e.g. "anthropic/claude-3.5-sonnet"
 * @param {string} params.systemPrompt - system role content
 * @param {string} params.userPrompt   - user role content (the actual task/input)
 * @param {number} [params.maxTokens]  - optional max_tokens override
 *
 * @returns {Promise<{content: string, promptTokens: number|null, completionTokens: number|null, raw: object}>}
 * @throws {Error} if the HTTP call fails or OpenRouter returns a non-2xx status
 */
async function callOpenRouter({ model, systemPrompt, userPrompt, maxTokens = 2000 }) {
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
    throw new Error(
      `OpenRouter request failed: ${response.status} ${response.statusText} — ${errorBody}`
    );
  }

  const data = await response.json();

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenRouter response missing choices[0].message.content');
  }

  return {
    content,
    promptTokens: data?.usage?.prompt_tokens ?? null,
    completionTokens: data?.usage?.completion_tokens ?? null,
    raw: data,
  };
}

module.exports = { callOpenRouter };
