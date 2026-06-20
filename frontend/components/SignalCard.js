// components/SignalCard.js
//
// One signal, summarized. Used on the home page (3 latest) and on
// /signals (full filtered list). Links to the full signal page.

import Link from 'next/link';

const IMPACT_LABEL = { low: 'Low impact', medium: 'Medium impact', high: 'High impact' };
const SIGNAL_TYPE_LABEL = {
  model_release: 'Model release',
  capability_update: 'Capability update',
  tool_launch: 'Tool launch',
  ecosystem_shift: 'Ecosystem shift',
};

export default function SignalCard({ signal }) {
  const points = Array.isArray(signal.summary_points) ? signal.summary_points.slice(0, 2) : [];

  return (
    <Link href={`/signal/${signal.slug}`} className="signal-card">
      <div className="signal-card__meta">
        <span className={`badge badge--${signal.impact_level || 'unknown'}`}>
          {IMPACT_LABEL[signal.impact_level] || 'Unknown impact'}
        </span>
        <span className="signal-card__type">
          {SIGNAL_TYPE_LABEL[signal.signal_type] || 'Signal'}
        </span>
      </div>

      <h3 className="signal-card__title">{signal.title}</h3>
      <p className="signal-card__description">{signal.excerpt || signal.description}</p>

      {points.length > 0 && (
        <ul className="signal-card__points">
          {points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      )}
    </Link>
  );
}
