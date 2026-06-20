# AIscentra Backend Core

One Express service implementing the 3-role AI pipeline:
**Researcher → Editor → Assistant**, backed by Supabase + OpenRouter.

## Architecture

- **Researcher** (`POST /api/research/generate`) — gathers structured research on a topic, writes to `research_sources`.
- **Editor** (`POST /api/articles/generate`) — atomically claims a pending research source (via `SELECT ... FOR UPDATE SKIP LOCKED`), turns it into an article draft.
- **Assistant** (`POST /api/assistant/query`) — answers user questions grounded only in published articles.

All three roles are tagged on every call in the `ai_runs` table — one service, three roles, full audit trail.

## Setup

### 1. Apply the database schema

In your Supabase project's SQL editor, run:

```
db/003_backend_core.sql
```

This creates `research_sources`, `articles`, `ai_runs`, the `updated_at` trigger, and the `claim_pending_research_source()` RPC function that powers the SKIP LOCKED pipeline safety.

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in:
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` — from your Supabase project's Settings → API (use the **service_role** key, not anon)
- `OPENROUTER_API_KEY` — from https://openrouter.ai/keys
- Optionally override `RESEARCH_MODEL` / `EDITOR_MODEL` / `ASSISTANT_MODEL` (any OpenRouter model slug)

### 3. Install and run

```bash
npm install
npm start
```

Server starts on `http://localhost:3001` (override with `PORT` in `.env`).

Check it's alive:
```bash
curl http://localhost:3001/health
```

## Testing the full pipeline locally

```bash
# 1. Generate a research source
curl -X POST http://localhost:3001/api/research/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "GPT-5.5 release", "category": "model_release"}'

# 2. Generate an article from the pending research source
curl -X POST http://localhost:3001/api/articles/generate

# 3. List draft articles (to find the id)
curl "http://localhost:3001/api/articles?status=draft"

# 4. Publish it (replace :id with the real article id from step 3)
curl -X PATCH http://localhost:3001/api/articles/:id/publish

# 5. List published articles (public default)
curl http://localhost:3001/api/articles

# 6. Ask the Assistant something
curl -X POST http://localhost:3001/api/assistant/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What AI models were released recently?"}'
```

## Concurrency safety

`POST /api/articles/generate` is safe to call concurrently — multiple
simultaneous requests will never claim the same `research_sources` row,
because the claim happens inside `claim_pending_research_source()`,
a single atomic Postgres function using `FOR UPDATE SKIP LOCKED`.

## Constraints honored

- Language is always `'en'`. No RU generation, no RU storage, no language switching.
- No Arena, no votes, no ratings — none of that exists in this schema or these routes.
- 3 roles, 1 service — no microservices, no message queues, no agent orchestration.
- Every OpenRouter call is logged to `ai_runs` with role, tokens, duration, and status — success or error.
