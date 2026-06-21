// app/page.js
//
// Home page. Server component — fetches data directly at request
// time via fetchSignals(), no client-side loading state needed.
//
// Hero block added below is purely visual (Ori design system) —
// the data fetch and SignalList rendering underneath is unchanged
// from the working version.

import SignalList from '../components/SignalList';
import { fetchSignals } from '../lib/api';

export default async function HomePage() {
  const signals = await fetchSignals({ limit: 3 });

  return (
    <div className="page page--home">

      <section className="hero">
        <span className="tag tag-hot" style={{ marginBottom: '20px', display: 'inline-block' }}>
          <span className="ldot" style={{ marginRight: '6px' }} />
          Live observatory
        </span>
        <h1 className="hero-title">Signals from the<br />AI ecosystem.</h1>
        <p className="hero-sub">
          AIscentra tracks model releases, capability updates, and ecosystem
          shifts — structured into clear, factual signals. No rankings.
          No hype. Just what changed.
        </p>
      </section>

      <div className="band" style={{ marginBottom: '40px' }}>
        <p>This week: <strong>{signals.length}</strong> new signals tracked across the AI ecosystem.</p>
      </div>

      <div className="sec-hd" style={{ padding: '0 0 16px', marginBottom: '0' }}>
        <span className="sec-lbl">Latest signals</span>
        <a href="/signals" className="sec-lnk">View all →</a>
      </div>

      <SignalList signals={signals} />

      <a href="/signals" className="view-all-link">View all signals →</a>
    </div>
  );
}
