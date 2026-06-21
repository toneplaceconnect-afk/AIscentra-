'use client';

// components/ModelFilters.js
//
// One dropdown for license_type. Mirrors SignalFilters' URL-as-state
// approach exactly — no global state, the URL query param is the
// source of truth, page re-fetches server-side on change.

import { useRouter, useSearchParams } from 'next/navigation';

const LICENSE_TYPES = ['proprietary', 'open_source', 'open_weights'];

export default function ModelFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('license_type') || '';

  function updateFilter(value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('license_type', value);
    } else {
      params.delete('license_type');
    }
    router.push(`/models?${params.toString()}`);
  }

  return (
    <div className="signal-filters">
      <label className="signal-filters__field">
        <span>License type</span>
        <select value={current} onChange={(e) => updateFilter(e.target.value)}>
          <option value="">All types</option>
          {LICENSE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>

      {current && (
        <button className="signal-filters__clear" onClick={() => router.push('/models')}>
          Clear filter
        </button>
      )}
    </div>
  );
}
