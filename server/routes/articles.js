// server/routes/articles.js
//
// 4 endpoints:
//   POST   /api/articles/generate    — Editor claims pending research, writes draft article
//   PATCH  /api/articles/:id/publish — flips draft -> published
//   GET    /api/articles             — list, filtered by status + language
//   GET    /api/articles/:slug       — single published EN article

const express = require('express');
const { supabase } = require('../lib/supabase');
const { runWithLogging, toNullableUuid } = require('../lib/aiRunLogger');
const { getCurrentUser } = require('../lib/currentUser');
const { EDITOR_SYSTEM_PROMPT } = require('../prompts');
const { EDITOR_FALLBACKS } = require('../lib/models');

const router = express.Router();


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
  const currentUser = await getCurrentUser(req);

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
        model: EDITOR_FALLBACKS,
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
    // The Editor now produces a structured SIGNAL, not a traditional
    // article — see server/prompts/index.js EDITOR_SYSTEM_PROMPT.
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

    const {
      title,
      slug,
      description,
      summary_points,
      signal_type,
      impact_level,
      confidence_level,
      full_content,
    } = parsed;

    if (!title || !slug || !full_content) {
      return res.status(502).json({
        error: 'Editor output missing required fields (title, slug, full_content).',
        parsed,
        research_source_id: researchRow.id,
      });
    }

    const ALLOWED_SIGNAL_TYPES = ['model_release', 'capability_update', 'tool_launch', 'ecosystem_shift'];
    const ALLOWED_LEVELS = ['low', 'medium', 'high'];

    if (signal_type && !ALLOWED_SIGNAL_TYPES.includes(signal_type)) {
      return res.status(502).json({
        error: `Editor returned invalid signal_type: "${signal_type}".`,
        parsed,
        research_source_id: researchRow.id,
      });
    }
    if (impact_level && !ALLOWED_LEVELS.includes(impact_level)) {
      return res.status(502).json({
        error: `Editor returned invalid impact_level: "${impact_level}".`,
        parsed,
        research_source_id: researchRow.id,
      });
    }
    if (confidence_level && !ALLOWED_LEVELS.includes(confidence_level)) {
      return res.status(502).json({
        error: `Editor returned invalid confidence_level: "${confidence_level}".`,
        parsed,
        research_source_id: researchRow.id,
      });
    }

    // Step 4: insert the signal as a draft.
    // `body` remains the existing column name (see db/004_signal_model.sql
    // for why we don't rename it) — it stores the Editor's full_content.
    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert({
        research_source_id: researchRow.id,
        user_id: toNullableUuid(currentUser.id),
        title,
        slug,
        excerpt: description ?? null,
        body: full_content,
        category: researchRow.category ?? null,
        language: 'en', // MVP: always 'en', never anything else
        status: 'draft',
        signal_type: signal_type ?? null,
        impact_level: impact_level ?? null,
        confidence_level: confidence_level ?? null,
        summary_points: Array.isArray(summary_points) ? summary_points : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[articles/generate] Failed to insert article:', insertError.message);
      return res.status(500).json({
        error: 'Signal generated but failed to save to database.',
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
 *
 * Additional optional filters, for the signal model:
 *   ?signal_type=model_release|capability_update|tool_launch|ecosystem_shift
 *   ?impact_level=low|medium|high
 *   ?limit=3 (defaults to 50, capped at 100)
 *
 * Examples:
 *   /api/articles?limit=3
 *   /api/articles?signal_type=model_release
 *   /api/articles?impact_level=high
 */
router.get('/', async (req, res) => {
  const status = req.query.status || 'published';
  const language = req.query.language || 'en';
  const { signal_type, impact_level } = req.query;

  const ALLOWED_SIGNAL_TYPES = ['model_release', 'capability_update', 'tool_launch', 'ecosystem_shift'];
  const ALLOWED_LEVELS = ['low', 'medium', 'high'];

  if (signal_type && !ALLOWED_SIGNAL_TYPES.includes(signal_type)) {
    return res.status(400).json({
      error: `Invalid signal_type. Must be one of: ${ALLOWED_SIGNAL_TYPES.join(', ')}.`,
    });
  }
  if (impact_level && !ALLOWED_LEVELS.includes(impact_level)) {
    return res.status(400).json({
      error: `Invalid impact_level. Must be one of: ${ALLOWED_LEVELS.join(', ')}.`,
    });
  }

  const rawLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;

  try {
    let queryBuilder = supabase
      .from('articles')
      .select(
        'id, title, slug, excerpt, category, language, status, signal_type, impact_level, confidence_level, summary_points, published_at, created_at'
      )
      .eq('status', status)
      .eq('language', language)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (signal_type) queryBuilder = queryBuilder.eq('signal_type', signal_type);
    if (impact_level) queryBuilder = queryBuilder.eq('impact_level', impact_level);

    const { data: articles, error } = await queryBuilder;

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
