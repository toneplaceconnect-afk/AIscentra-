-- ════════════════════════════════════════════════════════════════
-- AIscentra — models table (Model Intelligence Database)
-- New table, additive to db/003_backend_core.sql + 004_signal_model.sql.
-- ════════════════════════════════════════════════════════════════
--
-- WHAT THIS IS FOR:
-- The "models.html" page design (Ori design system) shows a detailed
-- intelligence card per AI model, with 6 tabs: Basics, Origin,
-- Evolution, Uses, Facts, Sources. This table stores that structured
-- data so those cards render from real Supabase data instead of the
-- hardcoded JS object in the original design mockup.
--
-- CRITICAL CONSTRAINT — NO RANKING:
-- The original design mockup included a numeric "Signal score" (e.g.
-- 94.2) and a "7-day momentum" delta (e.g. "↑ 12.4%") on every model
-- card and in a "Signal Index" leaderboard. Per explicit decision,
-- this is exactly the Arena/ranking mechanic the whole system was
-- built to avoid — comparing models against each other by a score.
--
-- This table intentionally has NO score, NO rank, NO delta/momentum
-- percentage, and NO leaderboard-style ordering field. Each model
-- is documented on its own terms. If you find yourself wanting to
-- add a "score" column here — don't; that's the ranking mechanic
-- creeping back in through a side door.
--
-- "Facts" tab data (GitHub stars, Reddit mentions, etc.) are kept as
-- raw observational counts in facts_data — these are neutral,
-- non-comparative metrics about a single model, not a score that
-- ranks it against others. The distinction matters: "87,000 GitHub
-- stars" describes one model; "94.2 vs 91.8" compares two.
-- ════════════════════════════════════════════════════════════════

create table if not exists models (
  id uuid primary key default gen_random_uuid(),

  -- ── Identity (always visible, list + card header) ──
  name text not null,                 -- e.g. "GPT-4o"
  slug text not null unique,          -- e.g. "gpt-4o" — used in /models/:slug
  maker text not null,                -- e.g. "OpenAI"
  maker_color text,                   -- hex color for the avatar badge, e.g. "#10a37f"
  avatar_label text,                  -- short badge text, e.g. "GPT"
  tagline text,                       -- e.g. "OpenAI · Multimodal · May 2024"

  -- ── Classification (used for filter tabs: All/Proprietary/Open-source/etc.) ──
  license_type text
    check (license_type in ('proprietary', 'open_source', 'open_weights')),
  tags jsonb,                         -- array of short tag strings, e.g. ["Multimodal","Proprietary","API"]

  -- ── Basics tab ──
  -- array of {label, value} pairs, rendered as a 2-column info grid.
  -- e.g. [{"label":"Context window","value":"128,000 tokens"}, ...]
  basics jsonb,

  -- ── Origin tab ──
  -- array of {heading, body} narrative blocks about who made it and why.
  origin jsonb,

  -- ── Evolution tab ──
  -- array of {heading, body} narrative blocks about how it changed over time.
  evolution jsonb,

  -- ── Uses tab ──
  -- array of {category, heading, body} — real-world use case clusters.
  uses jsonb,

  -- ── Facts tab ──
  -- array of {label, value} — neutral observational counts about THIS
  -- model only (GitHub stars, mentions, training cutoff date, etc).
  -- Not a comparative score. See constraint note above.
  facts_data jsonb,

  -- ── Sources tab ──
  -- array of {source_name, url, source_type} — where the observatory's
  -- information about this model comes from.
  sources jsonb,

  -- ── i18n — reserved, NOT active on MVP, same convention as articles ──
  language text not null default 'en',

  status text not null default 'draft'
    check (status in ('draft', 'published')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists models_slug_idx on models (slug);
create index if not exists models_maker_idx on models (maker);
create index if not exists models_status_idx on models (status);
create index if not exists models_language_idx on models (language);

comment on table models is
  'Model Intelligence Database. Documents each AI model on its own terms — explicitly excludes any score, rank, or comparative momentum metric. See header comment for why.';
comment on column models.facts_data is
  'Neutral per-model observational counts (e.g. GitHub stars, mentions). Not a comparative score — never add a cross-model ranking field here.';

-- Auto-update updated_at, reusing the same trigger function already
-- defined in db/003_backend_core.sql for the articles table.
drop trigger if exists models_set_updated_at on models;
create trigger models_set_updated_at
  before update on models
  for each row
  execute function set_updated_at();
