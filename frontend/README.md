# AIscentra Frontend — Signal Layer (Next.js App Router)

Minimal, structurally-correct frontend for the AIscentra signal system.
Visual design is intentionally plain — this layer is about data flow
and structure, not aesthetics.

## Running it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. By default it runs entirely on local mock
data (`lib/mockSignals.js`) — **no backend, no API keys required.**

To connect it to the real backend (the Express service in `server/`):

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## File structure

```
app/
  layout.js              — root layout, header/nav
  globals.css            — minimal global styles
  page.js                — Home (/) — 3 latest signals
  signals/
    page.js              — Signals list (/signals) — filterable
  signal/
    [slug]/
      page.js             — Signal detail (/signal/[slug])

components/
  SignalCard.js          — one signal, summarized (used on / and /signals)
  SignalList.js          — grid of SignalCard, with empty state
  SignalFilters.js       — dropdown filters, client component, drives URL params

lib/
  api.js                 — fetchSignals(), fetchSignalBySlug() — the
                           only place that knows about mock vs real API
  mockSignals.js          — local mock data, shaped like the real API response
```

## Data flow

1. Pages (server components) call `fetchSignals()` / `fetchSignalBySlug()`
   from `lib/api.js` directly — no client-side loading states needed.
2. `lib/api.js` checks `NEXT_PUBLIC_API_BASE_URL`:
   - unset → reads from `lib/mockSignals.js`
   - set → calls the real backend's `GET /api/articles` / `GET /api/articles/:slug`
3. Filters on `/signals` work by updating the URL's query string
   (`SignalFilters`, a client component) — the page itself re-reads
   `searchParams` on the server and re-fetches. No global state library.

## What this does NOT do (by design, per spec)

- No authentication
- No global state libraries (Redux, Zustand, Context providers, etc.)
- No animations
- No backend modifications — this is a read-only frontend layer
- No visual design system — plain CSS, functional only
