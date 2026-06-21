// app/signal/[slug]/page.js
//
// Full signal detail. Server component — fetches the one signal
// by slug. Renders a simple not-found state if it doesn't exist
// or isn't published, rather than throwing.

import { fetchSignalBySlug } from '../../../lib/api';

const IMPACT_LABEL = { low: 'Low impact', medium: 'Medium impact', high: 'High impact' };
const SIGNAL_TYPE_LABEL = {
  model_release: 'Model release',
  capability_update: 'Capability update',
  tool_launch: 'Tool launch',
  ecosystem_shift: 'Ecosystem shift',
};
const CONFIDENCE_LABEL = { low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' };

export default async function SignalDetailPage({ params }) {
  const signal = await fetchSignalBySlug(params.slug);

  if (!signal) {
    return (
      <div className="page page--signal-detail">
        <p className="empty-state">Signal not found.</p>
        <a href="/signals">← Back to all signals</a>
      </div>
    );
  }

  const points = Array.isArray(signal.summary_points) ? signal.summary_points : [];

  return (
    <article className="page page--signal-detail">
      <a href="/signals" className="back-link">← All signals</a>

      <div className="signal-detail__meta">
        <span className={`badge badge--${signal.impact_level || 'unknown'}`}>
          {IMPACT_LABEL[signal.impact_level] || 'Unknown impact'}
        </span>
        <span className="signal-detail__type">
          {SIGNAL_TYPE_LABEL[signal.signal_type] || 'Signal'}
        </span>
        <span className="signal-detail__confidence">
          {CONFIDENCE_LABEL[signal.confidence_level] || 'Unknown confidence'}
        </span>
      </div>

      <h1>{signal.title}</h1>
      <p className="signal-detail__description">{signal.excerpt || signal.description}</p>

      {points.length > 0 && (
        <ul className="signal-detail__points">
          {points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      )}

      <div className="divider" style={{ margin: '32px 0' }} />

      <div className="signal-detail__body">
        {(signal.full_content || signal.body || '')
          .split('\n')
          .filter(Boolean)
          .map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
      </div>

      <div className="divider" style={{ margin: '40px 0 24px' }} />
      <p className="signal-detail__footer-note mono steel">
        Signal tracked by AIscentra Observatory · {signal.category || signal.signal_type}
      </p>
    </article>
  );
}
