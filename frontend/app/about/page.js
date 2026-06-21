// app/about/page.js
//
// Static content page — no data fetching needed (the design's
// "847+ models tracked" stat box is presentational, not pulled from
// a live count; if/when that's wired to a real COUNT query, this is
// the file to update, but a static page is correct for now).
//
// One deliberate text change from the original design copy: removed
// the "rising 34% in the index" momentum-percentage example. Per
// project decision, no comparative/numeric momentum metric is shown
// anywhere in this product — that example contradicted the same
// paragraph's own "no rankings" claim, so it's cut rather than kept
// as a contradiction.

export const metadata = {
  title: 'About — AIscentra Observatory',
  description: 'AIscentra Observatory is an independent AI intelligence platform tracking the AI ecosystem. Synthesized by AI. Verified by data.',
};

export default function AboutPage() {
  return (
    <div className="page page--about about-pg">
      <div className="kicker">About the platform</div>
      <h1>Built to observe the AI ecosystem <em>without bias.</em></h1>

      <p>
        AIscentra Observatory is an independent AI intelligence platform.
        It tracks, synthesizes, and publishes intelligence about the AI
        ecosystem — models, releases, capability updates, and ecosystem
        shifts — as structured, factual signals.
      </p>
      <p>
        The platform operates without editorial opinion, ranking systems,
        or sponsored content. Every signal is synthesized from research
        data by AI, with the goal of publishing factual, timely
        intelligence that lets practitioners make better decisions.
      </p>

      <div className="grid-2">
        <div className="cell"><div className="cell-l">Models tracked</div><div className="cell-v">Growing</div></div>
        <div className="cell"><div className="cell-l">Data streams</div><div className="cell-v">Multiple</div></div>
        <div className="cell"><div className="cell-l">Established</div><div className="cell-v">2026</div></div>
        <div className="cell"><div className="cell-l">Signals published</div><div className="cell-v">Ongoing</div></div>
      </div>

      <h2>How it works</h2>
      <p>
        A three-role pipeline powers the observatory: a Researcher role
        gathers structured facts on a topic, an Editor role turns that
        research into a published signal — classified by type, impact,
        and confidence — and an Assistant role answers questions by
        synthesizing across multiple published signals.
      </p>
      <p>
        Every signal carries a short, scannable summary and a full
        analytical write-up, with neutral, fact-focused language
        throughout — no comparative framing, no superlatives.
      </p>

      <h2>What we don&apos;t do</h2>
      <p>
        No rankings. No &quot;best AI&quot; lists. No sponsored model
        promotions. No quality comparisons that reduce complex systems
        to a single score. Signals reflect what happened and what it
        implies — not a judgment of which model is &quot;better.&quot;
      </p>

      <h2>Languages</h2>
      <p>
        The observatory currently publishes in English only. Additional
        language editions are a planned future phase, not yet active —
        no non-English content is generated or published at this stage.
      </p>

      <h2>No account required</h2>
      <p>
        All content on AIscentra Observatory is free and openly
        accessible. No registration, no subscription, no paywall.
      </p>
    </div>
  );
}
