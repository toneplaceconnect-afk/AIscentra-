// server/routes/models.js
//
// 2 endpoints, read-only for now (model intelligence cards are
// curated/edited directly in Supabase, not AI-generated through the
// Researcher/Editor pipeline — at least not yet):
//   GET /api/models           — list, optionally filtered by license_type
//   GET /api/models/:slug     — single model's full intelligence card
//
// Per db/005_models_table.sql: no score, rank, or momentum delta
// exists on this table, and none is added here. Don't compute one
// in this file either (e.g. don't sort by some derived "popularity"
// number) — that's the exact mechanic this table was built to avoid.

const express = require('express');
const { supabase } = require('../lib/supabase');

const router = express.Router();

/**
 * GET /api/models?license_type=open_source
 *
 * Defaults to status=published, language=en. Sorted by maker then
 * name — alphabetical grouping, like the design's sidebar list
 * (sectioned by maker). No ranking-based ordering.
 */
router.get('/', async (req, res) => {
  const { license_type } = req.query;

  const ALLOWED_LICENSE_TYPES = ['proprietary', 'open_source', 'open_weights'];
  if (license_type && !ALLOWED_LICENSE_TYPES.includes(license_type)) {
    return res.status(400).json({
      error: `Invalid license_type. Must be one of: ${ALLOWED_LICENSE_TYPES.join(', ')}.`,
    });
  }

  try {
    let queryBuilder = supabase
      .from('models')
      .select('id, name, slug, maker, maker_color, avatar_label, tagline, license_type, tags')
      .eq('status', 'published')
      .eq('language', 'en')
      .order('maker', { ascending: true })
      .order('name', { ascending: true });

    if (license_type) queryBuilder = queryBuilder.eq('license_type', license_type);

    const { data: models, error } = await queryBuilder;

    if (error) {
      console.error('[models/list] Query failed:', error.message);
      return res.status(500).json({ error: 'Failed to fetch models.', detail: error.message });
    }

    return res.json({ models });
  } catch (err) {
    console.error('[models/list] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
  }
});

/**
 * GET /api/models/:slug
 *
 * Full intelligence card — all 6 tabs' worth of data in one response,
 * matching the design's MODELS[id] JS object shape but read from the
 * database instead of being hardcoded.
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const { data: model, error } = await supabase
      .from('models')
      .select('*')
      .eq('slug', slug)
      .eq('language', 'en')
      .eq('status', 'published')
      .single();

    if (error || !model) {
      return res.status(404).json({ error: 'Model not found.' });
    }

    return res.json({ model });
  } catch (err) {
    console.error('[models/get] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
  }
});

module.exports = router;
