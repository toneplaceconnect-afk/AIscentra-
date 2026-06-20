-- ════════════════════════════════════════════════════════════════
-- AIscentra — Signal model migration
-- Extends db/003_backend_core.sql — does NOT replace it.
-- ════════════════════════════════════════════════════════════════
--
-- WHY THIS MIGRATION EXISTS:
-- AIscentra is not a blog. It's an AI observatory tracking signals
-- in the AI ecosystem. The "article" row stays the same table —
-- per the constraint "DO NOT create new tables" — but each row now
-- carries structured signal metadata on top of the existing body.
--
-- This is additive only. No existing column is renamed, dropped, or
-- has its meaning changed. `body` stays as `full_content` would —
-- see note below on why we keep the column name `body` rather than
-- renaming it.
-- ════════════════════════════════════════════════════════════════


-- ── New columns on articles ──

alter table articles
  add column if not exists signal_type text
    check (signal_type in ('model_release', 'capability_update', 'tool_launch', 'ecosystem_shift'));

alter table articles
  add column if not exists impact_level text
    check (impact_level in ('low', 'medium', 'high'));

alter table articles
  add column if not exists confidence_level text
    check (confidence_level in ('low', 'medium', 'high'));

alter table articles
  add column if not exists summary_points jsonb;
  -- array of 3-5 short bullet strings, e.g.
  -- ["Adds 200k context window", "Pricing unchanged", "API-compatible with v1"]


-- ── Indexes for the new filterable fields ──
-- These directly support the new API filters:
--   /api/articles?signal_type=model_release
--   /api/articles?impact_level=high

create index if not exists articles_signal_type_idx
  on articles (signal_type);
create index if not exists articles_impact_level_idx
  on articles (impact_level);


-- ── Column comments — documents intent directly in the schema ──

comment on column articles.signal_type is
  'What kind of ecosystem event this signal represents. One of: model_release, capability_update, tool_launch, ecosystem_shift.';
comment on column articles.impact_level is
  'Editor-assessed significance of this signal: low, medium, or high. Not a popularity score — an analytical judgment of consequence.';
comment on column articles.confidence_level is
  'Editor-assessed confidence in the signal''s accuracy/completeness, based on source quality: low, medium, or high.';
comment on column articles.summary_points is
  'JSONB array of 3-5 short bullet-point strings — the scannable takeaway of the signal, shown above the full body.';

-- ── Note on `body` / `full_content` naming ──
-- The task spec's required Editor output includes "full_content".
-- We do NOT rename the existing `body` column — renaming a column
-- that's already read by routes/articles.js and routes/assistant.js
-- would touch live code paths for no structural gain, and the task
-- explicitly says not to rewrite the architecture. `body` IS the
-- full content field; the Editor route below maps its `full_content`
-- output to the existing `body` column. No schema rename needed.

-- ── No new tables. No Arena. No multi-language. No ranking fields. ──
-- This migration is intentionally limited to the 4 columns above.
