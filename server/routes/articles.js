// server/routes/articles.js
//
// 4 endpoints:
//   POST   /api/articles/generate    — Editor claims pending research, writes draft article
//   PATCH  /api/articles/:id/publish — flips draft -> published
//   GET    /api/articles             — list, filtered by status + language
//   GET    /api/articles/:slug       — single published EN article

const express = require('express');
const { supabase } = require('../lib/supabase');
const { runWithLogging } = require('../lib/aiRunLogger');
const { EDITOR_SYSTEM_PROMPT } = require('../prompts');

const router = express.Router();

const EDITOR_MODEL = process.env.EDITOR_MODEL || 'anthropic/claude-3.5-sonnet';

/**
 * POST /api/articles/generate
 *
 * Flow:
 *   1. Atomically claim one pending research_sources row via the
 *      claim_pending_research_source() RPC (SKIP LOCKED under the hood).
 *      This already flips it to status='used' — no separate update needed.
 *   2. Call OpenRouter with the Editor prompt, passing the claimed
 *      research JSON as input.
 *   3. Parse the model's JSON response into title/slug/excerpt/body.
 *   4. Insert a new articles row with status='draft'.
 *   5. Every OpenRouter call is logged to ai_runs via runWithLogging.
 *
 * If no research_sources row is pending, returns 404 — there's
 * nothing to generate from, and that's a normal, expected state.
 */
router.post('/generate', async (req, res) => {
  try {
    // Step 1: atomically claim a pending research source.
    const { data: claimed, error: claimError } = await supabase.rpc(
      'claim_pending_research_source'
    );

    if (claimError) {
      console.error('[articles/generate] claim_pending_research_source failed:', claimError.message);
      return res.status(500).json({ error: 'Failed to claim a research source.' });
    }

    if (!claimed || claimed.length === 0) {
      return res.status(404).json({ error: 'No pending research_sources rows available.' });
    }

    const researchRow = claimed[0];

    // Step 2: call OpenRouter as the Editor role.
    const userPrompt = JSON.stringify({
      topic: researchRow.topic,
      category: researchRow.category,
      research: researchRow.raw_content,
    });

    let editorResult;
    try {
      editorResult = await runWithLogging({
        role: 'editor',
        model: EDITOR_MODEL,
        systemPrompt: EDITOR_SYSTEM_PROMPT,
        userPrompt,
        researchSourceId: researchRow.id,
      });
    } catch (aiErr) {
      // The research_sources row is already marked 'used' by the RPC.
      // We deliberately do NOT revert it to 'pending' on AI failure —
      // per the schema's linear flow, a failed generation attempt is
      // logged in ai_runs (status='error') for manual review, rather
      // than silently retried, which could cause duplicate articles
      // if the failure was actually a timeout after a successful call.
      console.error('[articles/generate] OpenRouter call failed:', aiErr.message);
      return res.status(502).json({
        error: 'OpenRouter call failed during article generation.',
        detail: aiErr.message,
        research_source_id: researchRow.id,
      });
    }

    // Step 3: parse the Editor's JSON output.
    let parsed;
    try {
      parsed = JSON.parse(editorResult.content);
    } catch (parseErr) {
      console.error('[articles/generate] Failed to parse Editor output as JSON:', editorResult.content);
      return res.status(502).json({
        error: 'Editor model did not return valid JSON.',
        raw_output: editorResult.content,
        research_source_id: researchRow.id,
      });
    }

    const { title, slug, excerpt, body } = parsed;
    if (!title || !slug || !body) {
      return res.status(502).json({
        error: 'Editor output missing required fields (title, slug, body).',
        parsed,
        research_source_id: researchRow.id,
      });
    }

    // Step 4: insert the article as a draft.
    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert({
        research_source_id: researchRow.id,
        title,
        slug,
        excerpt: excerpt ?? null,
        body,
        category: researchRow.category ?? null,
        language: 'en', // MVP: always 'en', never anything else
        status: 'draft',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[articles/generate] Failed to insert article:', insertError.message);
      return res.status(500).json({
        error: 'Article generated but failed to save to database.',
        detail: insertError.message,
      });
    }

    return res.status(201).json({ article });
  } catch (err) {
    console.error('[articles/generate] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
  }
});

/**
 * PATCH /api/articles/:id/publish
 *
 * Flips a draft article to published. Idempotent-ish: if the
 * article is already published, this just re-confirms it (no error).
 */
router.patch('/:id/publish', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: article, error } = await supabase
      .from('articles')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // PostgREST "no rows" code when .single() finds nothing
        return res.status(404).json({ error: 'Article not found.' });
      }
      console.error('[articles/publish] Update failed:', error.message);
      return res.status(500).json({ error: 'Failed to publish article.', detail: error.message });
    }

    return res.json({ article });
  } catch (err) {
    console.error('[articles/publish] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
  }
});

/**
 * GET /api/articles?status=published&language=en
 *
 * Defaults to status=published&language=en if not specified —
 * the public-facing default. Pass explicit params to see drafts
 * (e.g. for an internal admin view).
 */
router.get('/', async (req, res) => {
  const status = req.query.status || 'published';
  const language = req.query.language || 'en';

  try {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, category, language, status, published_at, created_at')
      .eq('status', status)
      .eq('language', language)
      .order('published_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('[articles/list] Query failed:', error.message);
      return res.status(500).json({ error: 'Failed to fetch articles.', detail: error.message });
    }

    return res.json({ articles });
  } catch (err) {
    console.error('[articles/list] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
  }
});

/**
 * GET /api/articles/:slug
 *
 * Single published EN article by slug — what the public site and
 * the Assistant both read. Returns 404 if not found or not published.
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('language', 'en')
      .eq('status', 'published')
      .single();

    if (error || !article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    return res.json({ article });
  } catch (err) {
    console.error('[articles/get] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
  }
});

module.exports = router;
