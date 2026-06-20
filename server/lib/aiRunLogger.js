// server/lib/aiRunLogger.js
//
// Wraps a call to OpenRouter with full ai_runs logging: timing,
// success/error status, token counts, and the role/links that made
// the call. Every single OpenRouter call in this codebase should go
// through runWithLogging() — there is no path that skips logging.

const { supabase } = require('./supabase');
const { callOpenRouter } = require('./openrouter');

/**
 * Calls OpenRouter and logs the attempt (success or failure) to ai_runs.
 *
 * @param {Object} params
 * @param {'research'|'editor'|'assistant'} params.role
 * @param {string} params.model
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {string|null} [params.userId]
 * @param {string|null} [params.sessionId]
 * @param {string|null} [params.researchSourceId]
 * @param {string|null} [params.articleId]
 * @param {number} [params.maxTokens]
 *
 * @returns {Promise<{content: string, promptTokens: number|null, completionTokens: number|null}>}
 * @throws rethrows the original error after logging it to ai_runs
 */
async function runWithLogging({
  role,
  model,
  systemPrompt,
  userPrompt,
  userId = null,
  sessionId = null,
  researchSourceId = null,
  articleId = null,
  maxTokens = 2000,
}) {
  const startedAt = Date.now();

  try {
    const result = await callOpenRouter({ model, systemPrompt, userPrompt, maxTokens });
    const durationMs = Date.now() - startedAt;

    const { error: logError } = await supabase.from('ai_runs').insert({
      role,
      user_id: userId,
      session_id: sessionId,
      research_source_id: researchSourceId,
      article_id: articleId,
      model,
      prompt: userPrompt,
      response: result.content,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      status: 'success',
      duration_ms: durationMs,
    });

    if (logError) {
      // Logging failure should not silently disappear — but it also
      // shouldn't fail the actual AI call that already succeeded.
      console.error('[ai_runs] Failed to write success log:', logError.message);
    }

    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    const { error: logError } = await supabase.from('ai_runs').insert({
      role,
      user_id: userId,
      session_id: sessionId,
      research_source_id: researchSourceId,
      article_id: articleId,
      model,
      prompt: userPrompt,
      response: null,
      status: 'error',
      error_message: err.message?.slice(0, 2000) ?? 'Unknown error',
      duration_ms: durationMs,
    });

    if (logError) {
      console.error('[ai_runs] Failed to write error log:', logError.message);
    }

    throw err;
  }
}

module.exports = { runWithLogging };
