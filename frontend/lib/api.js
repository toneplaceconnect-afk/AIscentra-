// lib/api.js
//
// Single seam for all data fetching. Every page/component calls
// these two functions — none of them know whether the data came
// from the real backend or local mocks.
//
// Mode is controlled by NEXT_PUBLIC_API_BASE_URL:
//   - unset  -> uses local mock data (lib/mockSignals.js). No API
//               keys, no backend connection required to run this
//               frontend at all, per the task constraints.
//   - set    -> calls the real backend at that base URL, e.g.
//               http://localhost:3001 (the Express service built
//               earlier — GET /api/articles, GET /api/articles/:slug).
//
// No backend code is modified by this file or this frontend layer.

import { queryMockSignals, getMockSignalBySlug } from './mockSignals';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || null;

/**
 * Fetches a list of signals, optionally filtered.
 *
 * @param {Object} [params]
 * @param {string} [params.signal_type] - model_release | capability_update | tool_launch | ecosystem_shift
 * @param {string} [params.impact_level] - low | medium | high
 * @param {number} [params.limit]
 * @returns {Promise<Array>}
 */
export async function fetchSignals({ signal_type, impact_level, limit } = {}) {
  if (!API_BASE_URL) {
    // Mock mode — no network call at all.
    return queryMockSignals({ signal_type, impact_level, limit });
  }

  const query = new URLSearchParams();
  if (signal_type) query.set('signal_type', signal_type);
  if (impact_level) query.set('impact_level', impact_level);
  if (limit) query.set('limit', String(limit));

  const res = await fetch(`${API_BASE_URL}/api/articles?${query.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch signals: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.articles ?? [];
}

/**
 * Fetches a single signal by slug. Returns null if not found —
 * callers use this to render a 404 state, never throw on "not found".
 *
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function fetchSignalBySlug(slug) {
  if (!API_BASE_URL) {
    return getMockSignalBySlug(slug);
  }

  const res = await fetch(`${API_BASE_URL}/api/articles/${slug}`, {
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch signal "${slug}": ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.article ?? null;
}

/** True when running against local mock data (no backend configured). */
export const isMockMode = !API_BASE_URL;
