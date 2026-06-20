// server/routes/assistant.js
//
// 1 endpoint:
//   POST /api/assistant/query — Assistant role. Reads published EN
//   articles, builds context, calls OpenRouter, returns an answer
//   grounded only in what's actually published.

const express = require('express');
const { supabase } = require('../lib/supabase');
const { runWithLogging } = require('../lib/aiRunLogger');
const { ASSISTANT_SYSTEM_PROMPT, buildAssistantUserPrompt } = require('../prompts');

const router = express.Router();

const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || 'anthropic/claude-3.5-sonnet';

// How many published articles to pull in as context. MVP keeps this
// simple — no embeddings/vector search yet, just the most recent
// published articles. Good enough to validate the pipeline; a real
// retrieval step can replace this later without changing the route's
// public contract.
const CONTEXT_ARTICLE_LIMIT = 8;

/**
 * POST /api/assistant/query
 * Body: { query: string, user_id?: string, session_id?: string }
 *
 * Flow:
 *   1. Validate the query.
 *   2. Fetch the most recent published EN articles as context.
 *      (status='published' AND language='en' — no exceptions.)
 *   3. Build a prompt embedding those articles + the user's question.
 *   4. Call OpenRouter as the Assistant role.
 *   5. Log the call to ai_runs with role='assistant', user_id, session_id.
 */
router.post('/query', async (req, res) => {
  const { query, user_id, session_id } = req.body || {};

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "query" string.' });
  }

  try {
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('title, excerpt, body')
      .eq('status', 'published')
      .eq('language', 'en')
      .order('published_at', { ascending: false })
      .limit(CONTEXT_ARTICLE_LIMIT);

    if (fetchError) {
      console.error('[assistant/query] Failed to fetch articles:', fetchError.message);
      return res.status(500).json({ error: 'Failed to fetch articles for context.', detail: fetchError.message });
    }

    if (!articles || articles.length === 0) {
      return res.status(200).json({
        answer:
          "I don't have any published articles to draw from yet, so I can't answer that confidently right now.",
        articles_used: 0,
      });
    }

    const userPrompt = buildAssistantUserPrompt(query, articles);

    let assistantResult;
    try {
      assistantResult = await runWithLogging({
        role: 'assistant',
        model: ASSISTANT_MODEL,
        systemPrompt: ASSISTANT_SYSTEM_PROMPT,
        userPrompt,
        userId: user_id || null,
        sessionId: session_id || null,
      });
    } catch (aiErr) {
      console.error('[assistant/query] OpenRouter call failed:', aiErr.message);
      return res.status(502).json({
        error: 'OpenRouter call failed while answering the query.',
        detail: aiErr.message,
      });
    }

    return res.json({
      answer: assistantResult.content,
      articles_used: articles.length,
    });
  } catch (err) {
    console.error('[assistant/query] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
  }
});

module.exports = router;
