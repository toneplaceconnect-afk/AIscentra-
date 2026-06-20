// server/lib/supabase.js
//
// Single Supabase client for the whole backend, using the SERVICE
// ROLE key. This is intentional: the backend pipeline (Researcher /
// Editor / Assistant) needs to read and write research_sources,
// articles, and ai_runs directly, without going through RLS as an
// end user would. Never expose this key to the frontend.

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment. ' +
    'Copy .env.example to .env and fill in your real Supabase project values.'
  );
}

// This backend never uses Supabase Realtime (no live subscriptions —
// everything here is a plain REST query via supabase.from(...)). But
// the client still initializes a RealtimeClient internally on
// construction, which requires a native WebSocket implementation.
// Node < 22 doesn't have one built in, so we pass the `ws` package
// explicitly as the transport. This has no effect on anything this
// codebase actually does — it only satisfies that internal init step.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: ws,
  },
});

module.exports = { supabase };
