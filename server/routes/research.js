// server/routes/research.js
//
// 1 endpoint:
//   POST /api/research/generate — Researcher role, writes a new
//   research_sources row with status='pending', ready for Editor
//   to pick up later via claim_pending_research_source().

const express = require('express');
const { supabase } = require('../lib/supabase');
const { runWithLogging } = require('../lib/aiRunLogger');
const { RESEARCH_SYSTEM_PROMPT } = require('../prompts');

const router = express.Router();

const { RESEARCH_FALLBACKS } = require('../lib/models');

/**
 * POST /api/research/generate
 * Body: { topic: string, category?: string }
 *
 * Flow:
 *   1. Call OpenRouter as the Researcher role with the given topic.
 *   2. Parse the model's JSON response.
 *   3. Insert a new research_sources row, status='pending'.
 *   4. Log the call to ai_runs via runWithLogging.
 *
 * This is the entry point that feeds the pipeline — without calling
 * this (or seeding research_sources some other way), there is
 * nothing for /api/articles/generate to claim.
 */
router.post('/generate', async (req, res) => {
  const { topic, category } = req.body || {};

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Request body must include a "topic" string.' });
  }

  try {
    const userPrompt = category
      ? `Topic: ${topic}\nSuggested category: ${category}`
      : `Topic: ${topic}`;

    let researchResult;
    try {
      researchResult = await runWithLogging({
        role: 'research',
        model: RESEARCH_FALLBACKS,
        systemPrompt: RESEARCH_SYSTEM_PROMPT,
        userPrompt,
      });
    } catch (aiErr) {
      console.error('[research/generate] OpenRouter call failed:', aiErr.message);
      return res.status(502).json({
        error: 'OpenRouter call failed during research generation.',
        detail: aiErr.message,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(researchResult.content);
    } catch (parseErr) {
      console.error('[research/generate] Failed to parse Researcher output as JSON:', researchResult.content);
      return res.status(502).json({
        error: 'Researcher model did not return valid JSON.',
        raw_output: researchResult.content,
      });
    }

    const { summary, facts, category: parsedCategory, links } = parsed;
    if (!summary || !Array.isArray(facts)) {
      return res.status(502).json({
        error: 'Researcher output missing required fields (summary, facts).',
        parsed,
      });
    }

    const { data: researchSource, error: insertError } = await supabase
      .from('research_sources')
      .insert({
        topic,
        category: category || parsedCategory || null,
        raw_content: { summary, facts, links: links ?? [] },
        model_used: researchResult.modelUsed,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[research/generate] Failed to insert research_sources row:', insertError.message);
      return res.status(500).json({
        error: 'Research generated but failed to save to database.',
        detail: insertError.message,
      });
    }

    return res.status(201).json({ research_source: researchSource });
  } catch (err) {
    console.error('[research/generate] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
  }
});

module.exports = router;
