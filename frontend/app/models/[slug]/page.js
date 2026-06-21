// app/models/[slug]/page.js
//
// Single model detail. Server component — fetches the one model by
// slug. Renders a not-found state if it doesn't exist or isn't
// published, same convention as signal/[slug]/page.js.
//
// No score, rank, or comparative metric is rendered anywhere on this
// page — the model object from fetchModelBySlug() has no such field
// (see db/005_models_table.sql), and this page does not compute one.

import ModelTabs from '../../../components/ModelTabs';
import { fetchModelBySlug } from '../../../lib/api';

export default async function ModelDetailPage({ params }) {
  const model = await fetchModelBySlug(params.slug);

  if (!model) {
    return (
      <div className="page page--model-detail">
        <p className="empty-state">Model not found.</p>
        <a href="/models">← Back to all models</a>
      </div>
    );
  }

  return (
    <article className="page page--model-detail">
      <a href="/models" className="back-link">← All models</a>

      <div className="model-detail__header">
        <div className="model-card__avatar model-detail__avatar" style={{ background: model.maker_color || '#3c3c3c' }}>
          {model.avatar_label || model.name?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1>{model.name}</h1>
          <p className="signal-detail__description">{model.tagline}</p>
        </div>
      </div>

      {Array.isArray(model.tags) && model.tags.length > 0 && (
        <div className="model-card__tags" style={{ marginBottom: '32px' }}>
          {model.tags.map((tag, i) => (
            <span key={i} className="tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="divider" style={{ margin: '0 0 32px' }} />

      <ModelTabs model={model} />
    </article>
  );
}
