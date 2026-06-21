// app/models/page.js
//
// Models list with filters. Mirrors app/signals/page.js exactly —
// server component, reads filter state from URL searchParams.

import ModelList from '../../components/ModelList';
import ModelFilters from '../../components/ModelFilters';
import { fetchModels } from '../../lib/api';

export default async function ModelsPage({ searchParams }) {
  const license_type = searchParams?.license_type || undefined;

  const models = await fetchModels({ license_type });

  return (
    <div className="page page--models">
      <h1>Tracked models</h1>
      <p className="page__subtitle">
        Models documented by the observatory, on their own terms — no rankings.
      </p>

      <ModelFilters />

      <ModelList models={models} />
    </div>
  );
}
