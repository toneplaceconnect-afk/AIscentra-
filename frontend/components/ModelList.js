// components/ModelList.js
//
// Renders a list of models as cards. Mirrors SignalList exactly —
// pure presentation, no fetching here.

import ModelCard from './ModelCard';

export default function ModelList({ models }) {
  if (!models || models.length === 0) {
    return <p className="empty-state">No models match these filters.</p>;
  }

  return (
    <div className="signal-list model-list">
      {models.map((model) => (
        <ModelCard key={model.id || model.slug} model={model} />
      ))}
    </div>
  );
}
