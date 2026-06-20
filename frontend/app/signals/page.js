// app/signals/page.js
//
// Full signals list with filters. Server component — reads filter
// state directly from the URL's searchParams (provided by Next.js),
// fetches accordingly. SignalFilters (client component) is what
// changes the URL when the user picks a filter; this page just
// reacts to whatever the URL says on each request.

import SignalList from '../../components/SignalList';
import SignalFilters from '../../components/SignalFilters';
import { fetchSignals } from '../../lib/api';

export default async function SignalsPage({ searchParams }) {
  const signal_type = searchParams?.signal_type || undefined;
  const impact_level = searchParams?.impact_level || undefined;

  const signals = await fetchSignals({ signal_type, impact_level });

  return (
    <div className="page page--signals">
      <h1>All signals</h1>

      <SignalFilters />

      <SignalList signals={signals} />
    </div>
  );
}
