// app/page.js
//
// Home page. Server component — fetches data directly at request
// time via fetchSignals(), no client-side loading state needed.

import SignalList from '../components/SignalList';
import { fetchSignals } from '../lib/api';

export default async function HomePage() {
  const signals = await fetchSignals({ limit: 3 });

  return (
    <div className="page page--home">
      <h1>Latest signals</h1>
      <p className="page__subtitle">
        The 3 most recent structured signals tracked across the AI ecosystem.
      </p>

      <SignalList signals={signals} />

      <a href="/signals" className="view-all-link">View all signals →</a>
    </div>
  );
}
