// server/lib/currentUser.js
//
// ════════════════════════════════════════════════════════════════
// AUTH BOUNDARY — this is the ONLY file that knows there is no real
// authentication yet. Every other file calls getCurrentUser() and
// gets back a user object, without caring how that user was resolved.
//
// When real auth is added later (Supabase Auth session, JWT, etc.),
// only this function's body changes. No route, no pipeline logic,
// no SQL needs to change — they already expect { id: string }.
// ════════════════════════════════════════════════════════════════
//
// Current behavior (no auth): always returns a fixed demo user.
// This is intentional and temporary. It is NOT a security boundary —
// it's a structural placeholder so every piece of data already has
// a userId shape to flow through, the day real auth is wired in.

const DEMO_USER = { id: 'demo-user' };

/**
 * Resolves the "current user" for a request.
 *
 * MVP (no auth): ignores its argument entirely and always returns
 * the fixed demo user. Kept as an async function and accepting a
 * `req` parameter now so call sites don't need to change later —
 * a real implementation would read req.headers.authorization or a
 * Supabase Auth session here and return the resolved user, or throw
 * an auth error if missing/invalid.
 *
 * @param {import('express').Request} [req] - unused on MVP, reserved
 *   for real auth (e.g. reading a Bearer token or session cookie).
 * @returns {Promise<{ id: string }>}
 */
async function getCurrentUser(req) {
  return DEMO_USER;
}

module.exports = { getCurrentUser };
