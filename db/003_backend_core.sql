-- ════════════════════════════════════════════════════════════════
-- AIscentra — Backend core schema (Supabase / Postgres)
-- Supersedes db/002_mvp_schema.sql — this is the current version.
-- ════════════════════════════════════════════════════════════════
--
-- Pipeline: Researcher -> research_sources -> Editor -> articles -> Assistant
-- One backend service, 3 roles tagged on every ai_runs row.
--
-- No Arena, no votes, no ratings, no battles — none of that exists here.
--
-- i18n: 'language' and 'original_article_id' on articles are reserved
-- fields. MVP writes ONLY language = 'en'. No RU content is generated,
-- published, or stored at this stage.
--
-- CHANGE LOG vs 002_mvp_schema.sql:
--   - articles.status narrowed to draft/published (removed 'generated')
--   - research_sources.raw_content changed text -> jsonb
--   - research_sources.status narrowed to pending/used (removed 'discarded')
--   - research_sources.used_at added
--   - ai_runs expanded: user_id, session_id, status (success/error),
--     error_message, duration_ms
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- 1. research_sources
-- ────────────────────────────────────────────────────────────────
-- Raw, structured output from the Researcher role. Input for Editor.
create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),

  topic text not null,
  category text,

  raw_content jsonb not null,
  -- structured (not free text) so Editor can reliably parse fields
  -- like { "summary": "...", "facts": [...], "links": [...] }

  model_used text,

  status text not null default 'pending'
    check (status in ('pending', 'used')),
  -- 'pending' -> collected, not yet consumed by Editor
  -- 'used'    -> an article has been generated from this row

  used_at timestamptz,
  -- set the moment this row is claimed by an Editor run.
  -- Used together with status='used' to know exactly when it
  -- was consumed, for debugging double-use or stale claims.

  created_at timestamptz not null default now()
);

create index if not exists research_sources_status_idx
  on research_sources (status);
create index if not exists research_sources_category_idx
  on research_sources (category);

comment on column research_sources.raw_content is
  'Structured JSON from the Researcher role. Not free text — Editor parses fields out of this.';
comment on column research_sources.used_at is
  'Timestamp set when this row is claimed via SELECT ... FOR UPDATE SKIP LOCKED and marked used.';


-- ────────────────────────────────────────────────────────────────
-- 2. articles
-- ────────────────────────────────────────────────────────────────
-- Published output from the Editor role. Single source of truth
-- read by Assistant and displayed on the site.
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),

  research_source_id uuid references research_sources(id) on delete set null,

  user_id uuid references auth.users(id) on delete set null,
  -- nullable: MVP content is AI-pipeline-driven, not user-submitted.
  -- Reserved for future personalization (e.g. user-curated articles).

  title text not null,
  slug text not null,
  excerpt text,
  body text not null,
  category text,

  -- ── i18n — reserved, NOT active on MVP ──
  -- MVP writes ONLY rows where language = 'en'. No exceptions.
  language text not null default 'en',

  original_article_id uuid references articles(id) on delete set null,
  -- Always null on MVP. Populated only once a translation pipeline
  -- is built, in a later phase — not now.

  status text not null default 'draft'
    check (status in ('draft', 'published')),
  -- 'draft'     -> generated, not yet live
  -- 'published' -> live on the site
  -- (no intermediate 'generated' status — draft IS the generated state
  --  until explicitly published)

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
  'draft -> published. No intermediate "generated" status on this version of the schema.';

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
-- Full audit log of every OpenRouter call across all 3 roles.
-- This is the trail that makes "1 service, 3 roles" debuggable,
-- cost-trackable, and error-traceable.
create table if not exists ai_runs (
  id uuid primary key default gen_random_uuid(),

  role text not null
    check (role in ('research', 'editor', 'assistant')),

  user_id uuid references auth.users(id) on delete set null,
  -- who triggered this run, if applicable. Primarily relevant for
  -- role='assistant' (a real user asking a question). Null for
  -- fully automated research/editor runs with no human in the loop.

  session_id text,
  -- groups multiple assistant turns into one conversation. Not a
  -- FK — it's a client-generated string, since sessions aren't a
  -- first-class table on MVP.

  research_source_id uuid references research_sources(id) on delete set null,
  article_id uuid references articles(id) on delete set null,
  -- loose, nullable links to what this run was for. No FK enforced
  -- beyond referential integrity — not every run produces or
  -- relates to a specific row.

  model text not null,
  prompt text not null,
  response text,

  prompt_tokens int,
  completion_tokens int,

  status text not null default 'success'
    check (status in ('success', 'error')),
  error_message text,

  duration_ms int,
  -- wall-clock time of the OpenRouter call, for performance analytics
  -- and spotting slow/expensive calls.

  created_at timestamptz not null default now()
);

create index if not exists ai_runs_role_idx
  on ai_runs (role);
create index if not exists ai_runs_status_idx
  on ai_runs (status);
create index if not exists ai_runs_created_at_idx
  on ai_runs (created_at);
create index if not exists ai_runs_session_id_idx
  on ai_runs (session_id);
create index if not exists ai_runs_user_id_idx
  on ai_runs (user_id);

comment on column ai_runs.user_id is
  'Supabase auth.users reference. Mainly populated for role=assistant. Null for automated research/editor runs.';
comment on column ai_runs.session_id is
  'Client-generated string grouping assistant conversation turns. Not a FK — sessions are not a table on MVP.';
comment on column ai_runs.duration_ms is
  'Wall-clock duration of the OpenRouter call in milliseconds.';


-- ════════════════════════════════════════════════════════════════
-- Safe pipeline pattern (reference — actual query lives in backend code)
-- ════════════════════════════════════════════════════════════════
--
-- To claim exactly one pending research_sources row without two
-- concurrent Editor runs picking the same one:
--
--   BEGIN;
--     SELECT * FROM research_sources
--     WHERE status = 'pending'
--     FOR UPDATE SKIP LOCKED
--     LIMIT 1;
--
--     -- ... call OpenRouter, build the article ...
--
--     UPDATE research_sources
--     SET status = 'used', used_at = now()
--     WHERE id = :claimed_id;
--
--     INSERT INTO articles (...) VALUES (...);
--   COMMIT;
--
-- The actual SELECT + claim happens atomically via the RPC function
-- below, called from server/routes/articles.js. Supabase's JS client
-- cannot run a bare "SELECT ... FOR UPDATE SKIP LOCKED" directly, so
-- this is wrapped in a plpgsql function and invoked via supabase.rpc().


-- ────────────────────────────────────────────────────────────────
-- RPC: claim_pending_research_source
-- ────────────────────────────────────────────────────────────────
-- Atomically selects ONE pending research_sources row, locks it with
-- SKIP LOCKED (so concurrent callers never block on or double-claim
-- the same row), marks it 'used' with used_at = now(), and returns
-- the row's original data so the caller can build an article from it.
--
-- This is the one place in the schema where "select + update" is
-- guaranteed atomic — by being a single plpgsql function, the whole
-- thing runs as one statement from Postgres's point of view.
create or replace function claim_pending_research_source()
returns table (
  id uuid,
  topic text,
  category text,
  raw_content jsonb,
  model_used text,
  created_at timestamptz
) as $$
declare
  claimed_id uuid;
begin
  select rs.id into claimed_id
  from research_sources rs
  where rs.status = 'pending'
  for update skip locked
  limit 1;

  if claimed_id is null then
    return; -- no rows pending — caller gets an empty result set
  end if;

  update research_sources
  set status = 'used', used_at = now()
  where research_sources.id = claimed_id;

  return query
    select rs.id, rs.topic, rs.category, rs.raw_content, rs.model_used, rs.created_at
    from research_sources rs
    where rs.id = claimed_id;
end;
$$ language plpgsql;

comment on function claim_pending_research_source is
  'Atomically claims one pending research_sources row via FOR UPDATE SKIP LOCKED, marks it used, and returns it. Call via supabase.rpc(''claim_pending_research_source'').';

