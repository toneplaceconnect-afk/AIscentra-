'use client';

// components/ModelTabs.js
//
// Client component for tab switching only — receives all model data
// as a prop from the server-rendered parent page, does no fetching
// itself. This is the one piece of the model detail page that needs
// client-side interactivity (clicking a tab).

import { useState } from 'react';

const TABS = [
  { key: 'basics', label: 'Basics' },
  { key: 'origin', label: 'Origin' },
  { key: 'evolution', label: 'Evolution' },
  { key: 'uses', label: 'Uses' },
  { key: 'facts_data', label: 'Facts' },
  { key: 'sources', label: 'Sources' },
];

export default function ModelTabs({ model }) {
  const availableTabs = TABS.filter((t) => Array.isArray(model[t.key]) && model[t.key].length > 0);
  const [active, setActive] = useState(availableTabs[0]?.key || 'basics');

  if (availableTabs.length === 0) {
    return <p className="empty-state">No detailed information available for this model yet.</p>;
  }

  const items = model[active] || [];

  return (
    <div className="model-tabs">
      <div className="model-tabs__nav">
        {availableTabs.map((tab) => (
          <button
            key={tab.key}
            className={`model-tabs__btn ${active === tab.key ? 'model-tabs__btn--active' : ''}`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="model-tabs__panel">
        {active === 'basics' || active === 'facts_data' ? (
          <dl className="model-tabs__grid">
            {items.map((item, i) => (
              <div key={i} className="model-tabs__grid-row">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : active === 'sources' ? (
          <ul className="model-tabs__sources">
            {items.map((item, i) => (
              <li key={i}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.source_name}
                </a>
                <span className="tag" style={{ marginLeft: '8px' }}>{item.source_type}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="model-tabs__narrative">
            {items.map((item, i) => (
              <div key={i} className="model-tabs__narrative-block">
                {item.category && <span className="tag tag-green" style={{ marginBottom: '8px', display: 'inline-block' }}>{item.category}</span>}
                {item.heading && <h4>{item.heading}</h4>}
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
