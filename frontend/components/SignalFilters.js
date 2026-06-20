'use client';

// components/SignalFilters.js
//
// Two simple dropdowns. On change, pushes new query params to the
// URL via the Next.js router — the /signals page reads those params
// server-side and re-fetches filtered data. No client-side global
// state, no context — the URL itself is the state.

import { useRouter, useSearchParams } from 'next/navigation';

const SIGNAL_TYPES = ['model_release', 'capability_update', 'tool_launch', 'ecosystem_shift'];
const IMPACT_LEVELS = ['low', 'medium', 'high'];

export default function SignalFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSignalType = searchParams.get('signal_type') || '';
  const currentImpactLevel = searchParams.get('impact_level') || '';

  function updateFilter(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/signals?${params.toString()}`);
  }

  return (
    <div className="signal-filters">
      <label className="signal-filters__field">
        <span>Signal type</span>
        <select
          value={currentSignalType}
          onChange={(e) => updateFilter('signal_type', e.target.value)}
        >
          <option value="">All types</option>
          {SIGNAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>

      <label className="signal-filters__field">
        <span>Impact level</span>
        <select
          value={currentImpactLevel}
          onChange={(e) => updateFilter('impact_level', e.target.value)}
        >
          <option value="">All levels</option>
          {IMPACT_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </label>

      {(currentSignalType || currentImpactLevel) && (
        <button className="signal-filters__clear" onClick={() => router.push('/signals')}>
          Clear filters
        </button>
      )}
    </div>
  );
}
