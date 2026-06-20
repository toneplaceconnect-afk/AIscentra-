// components/SignalList.js
//
// Renders a list of signals as cards. Pure presentation — no
// fetching here. Pages own the fetch, this just lays out the result.

import SignalCard from './SignalCard';

export default function SignalList({ signals }) {
  if (!signals || signals.length === 0) {
    return <p className="empty-state">No signals match these filters.</p>;
  }

  return (
    <div className="signal-list">
      {signals.map((signal) => (
        <SignalCard key={signal.id || signal.slug} signal={signal} />
      ))}
    </div>
  );
}
