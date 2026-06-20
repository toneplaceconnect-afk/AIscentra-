-- ════════════════════════════════════════════════════════════════
-- AIscentra — MVP database schema (Supabase / Postgres)
-- ════════════════════════════════════════════════════════════════
--
-- Scope: minimum viable schema for the 3-role pipeline
-- (Researcher → Editor → Assistant), implemented as ONE backend
-- service that tags every OpenRouter call with a role.
--
-- 3 tables total. No Arena, no votes, no ratings, no battles —
-- none of that exists in this schema, by design.
--
-- i18n: 'language' and 'original_article_id' exist on articles
-- as reserved fields. MVP writes ONLY language = 'en'. No RU
-- content is generated, published, or stored at this stage.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- 1. research_sources
-- ────────────────────────────────────────────────────────────────
-- What it's for: stores the raw, unstructured output produced by
-- the Researcher role before it becomes a published article.
-- This is the input the Editor role reads from.
--
-- Why it exists: separating raw research from polished articles
-- means a single research run can later support multiple article
-- angles, and keeps "what the AI found" auditable separately from
-- "what we published."
create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),

  topic text not null,              -- e.g. "GPT-5.5 release", "MiMo-V2 family"
  category text,                    -- e.g. "model_release", "coding_agents"

  raw_content text not null,        -- unstructured research output (JSON or text)
  model_used text,                  -- which OpenRouter model produced this

  status text not null default 'pending',
  -- 'pending'   → collected, not yet used by Editor
  -- 'used'      → an article has been generated from this
  -- 'discarded' → reviewed and rejected, won't be used

  created_at timestamptz not null default now()
);

create index if not exists research_sources_status_idx
  on research_sources (status);
create index if not exists research_sources_category_idx
  on research_sources (category);


-- ────────────────────────────────────────────────────────────────
-- 2. articles
-- ────────────────────────────────────────────────────────────────
-- What it's for: the polished, published output of the Editor role.
-- This is the single source of truth the Assistant role reads from
-- when answering users — and what the public site displays.
--
-- Why it exists: this is the core content table. Everything in the
-- pipeline points toward producing rows here.
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),

  research_source_id uuid references research_sources(id) on delete set null,
  -- traceability: which research run this article came from.
  -- Nullable — an article could theoretically be authored without
  -- a logged research_sources row, though that shouldn't happen in
  -- normal pipeline operation.

  user_id uuid references auth.users(id) on delete set null,
  -- links the article to a Supabase auth user. On MVP the pipeline
  -- is AI-driven (not user-submitted), so this is typically the
  -- service/admin account that triggered generation, or null for
  -- fully automated runs. Nullable by design — articles are not
  -- user-generated content.

  title text not null,
  slug text not null,
  excerpt text,
  body text not null,
  category text,                    -- mirrors research_sources.category for filtering

  -- ── i18n — reserved, NOT active on MVP ──
  -- MVP writes ONLY rows where language = 'en'. No exceptions.
  language text not null default 'en',

  -- self-reference: links a translation back to its original.
  -- Always null on MVP. Populated only once a translation
  -- pipeline is built, in a later phase — not now.
  original_article_id uuid references articles(id) on delete set null,

  status text not null default 'draft',
  -- 'draft'     → Editor produced a draft, not yet finalized
  -- 'generated' → AI generation complete, awaiting publish decision
  -- 'published' → live on the site

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists articles_slug_language_idx
  on articles (slug, language);
create index if not exists articles_status_idx
  on articles (status);
create index if not exists articles_language_idx
  on articles (language);
create index if not exists articles_original_article_id_idx
  on articles (original_article_id);
create index if not exists articles_user_id_idx
  on articles (user_id);

comment on column articles.language is
  'ISO 639-1 code. MVP writes ONLY "en" — no RU or other language content at this stage. Reserved for future expansion.';
comment on column articles.original_article_id is
  'Self-FK to the original-language article. Always null on MVP. Populated only once a translation pipeline ships later.';
comment on column articles.user_id is
  'Supabase auth.users reference. Nullable — MVP content is AI-pipeline-driven, not user-submitted.';
comment on column articles.status is
  'draft -> generated -> published. Linear flow, no branching on MVP.';

-- Optional hard guardrail — uncomment to make the DB itself reject
-- any non-EN row during MVP:
-- alter table articles add constraint articles_mvp_en_only check (language = 'en');

-- ── Auto-update updated_at on every row change ──
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists articles_set_updated_at on articles;
create trigger articles_set_updated_at
  before update on articles
  for each row
  execute function set_updated_at();


-- ────────────────────────────────────────────────────────────────
-- 3. ai_runs
-- ────────────────────────────────────────────────────────────────
-- What it's for: a log of every single call made to OpenRouter,
-- across all three roles. One service, three roles — this table
-- is how you tell them apart after the fact and debug/cost-track
-- the pipeline.
--
-- Why it exists: without this, there's no way to answer "what did
-- the Assistant actually send to the model for this user question"
-- or "how much did generating this article cost." It's the audit
-- trail for the entire system.
create table if not exists ai_runs (
  id uuid primary key default gen_random_uuid(),

  role text not null,
  -- 'research' | 'editor' | 'assistant' — required, always set.
  -- This is the field that makes "3 logical roles, 1 service" work:
  -- every call is explicitly tagged with which role it served.

  -- loose links back to what this run was for — nullable, no FK
  -- enforced, because not every run produces or relates to a
  -- specific row (e.g. an Assistant chat turn often won't).
  research_source_id uuid references research_sources(id) on delete set null,
  article_id uuid references articles(id) on delete set null,

  model text not null,              -- e.g. "anthropic/claude-3.5-sonnet"
  prompt text not null,
  response text,

  prompt_tokens int,
  completion_tokens int,

  status text not null default 'ok',  -- 'ok' | 'error'
  error_message text,

  created_at timestamptz not null default now()
);

create index if not exists ai_runs_role_idx
  on ai_runs (role);
create index if not exists ai_runs_created_at_idx
  on ai_runs (created_at);
