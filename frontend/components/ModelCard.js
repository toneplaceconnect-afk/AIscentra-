// components/ModelCard.js
//
// One model, summarized. Mirrors SignalCard's structure exactly.
// Deliberately does NOT render any score, rank, or delta — the
// models table has no such field (see db/005_models_table.sql),
// and this component must not invent one client-side either.

import Link from 'next/link';

export default function ModelCard({ model }) {
  return (
    <Link href={`/models/${model.slug}`} className="signal-card model-card">
      <div className="model-card__avatar" style={{ background: model.maker_color || '#3c3c3c' }}>
        {model.avatar_label || model.name?.slice(0, 2).toUpperCase()}
      </div>

      <h3 className="signal-card__title">{model.name}</h3>
      <p className="signal-card__description">{model.tagline}</p>

      {Array.isArray(model.tags) && model.tags.length > 0 && (
        <div className="model-card__tags">
          {model.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
