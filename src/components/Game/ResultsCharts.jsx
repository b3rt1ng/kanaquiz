import React from 'react';
import './ResultsCharts.scss';

// Red (0%) -> amber -> green (100%) based on accuracy.
function accuracyColor(pct) {
  return `hsl(${Math.round(pct * 1.2)}, 70%, 45%)`;
}

function AccuracyByCharacter({ characters }) {
  if (characters.length === 0) return null;

  // Worst accuracy first — this is the "what to review" list.
  const rows = characters
    .slice()
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);

  return (
    <div className="chart-card">
      <h4 className="chart-title">Accuracy by Character</h4>
      <p className="chart-sub">Characters to review first are at the top.</p>
      <div className="char-rows">
        {rows.map(c => (
          <div className="char-row" key={c.kana}>
            <span className="char-glyph">{c.kana}</span>
            <span className="char-romaji">{c.romaji}</span>
            <div className="char-bar-track">
              <div
                className="char-bar-fill"
                style={{ width: c.accuracy + '%', backgroundColor: accuracyColor(c.accuracy) }}
              />
            </div>
            <span className="char-value">{c.correct}/{c.total} · {c.accuracy}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfusionPairs({ pairs }) {
  if (pairs.length === 0) {
    return (
      <div className="chart-card">
        <h4 className="chart-title">Confusion Pairs</h4>
        <p className="chart-sub empty">No confusion - flawless! 🎉</p>
      </div>
    );
  }

  const top = pairs.slice().sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div className="chart-card">
      <h4 className="chart-title">Confusion Pairs</h4>
      <p className="chart-sub">What you answered instead of the correct answer.</p>
      <div className="confusion-rows">
        {top.map((p, i) => (
          <div className="confusion-row" key={i}>
            <span className="confusion-q">
              <span className="confusion-glyph">{p.kana}</span>
              <span className="confusion-correct">{p.romaji}</span>
            </span>
            <span className="confusion-arrow">→</span>
            <span className="confusion-given">« {p.given} »</span>
            <span className="confusion-count">×{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponseTime({ characters, overallAvgMs }) {
  const timed = characters.filter(c => c.avgMs > 0);
  if (timed.length === 0) return null;

  const slowest = timed.slice().sort((a, b) => b.avgMs - a.avgMs).slice(0, 6);
  const maxMs = slowest[0].avgMs;

  return (
    <div className="chart-card">
      <h4 className="chart-title">Response Time</h4>
      <p className="chart-sub">
        Overall average: <strong>{(overallAvgMs / 1000).toFixed(1)} s</strong> · The ones taking you the longest:
      </p>
      <div className="char-rows">
        {slowest.map(c => (
          <div className="char-row" key={c.kana}>
            <span className="char-glyph">{c.kana}</span>
            <span className="char-romaji">{c.romaji}</span>
            <div className="char-bar-track">
              <div
                className="char-bar-fill time"
                style={{ width: Math.round((c.avgMs / maxMs) * 100) + '%' }}
              />
            </div>
            <span className="char-value">{(c.avgMs / 1000).toFixed(1)} s</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsCharts({ characterStats, confusionPairs }) {
  // Flatten characterStats into an array of derived metrics.
  const characters = Object.keys(characterStats || {}).map(kana => {
    const s = characterStats[kana];
    return {
      kana,
      romaji: s.romaji,
      correct: s.correct,
      total: s.total,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      avgMs: s.total > 0 ? Math.round(s.timeMs / s.total) : 0
    };
  });

  const totalAnswers = characters.reduce((sum, c) => sum + c.total, 0);
  const totalTimeMs = characters.reduce((sum, c) => sum + c.avgMs * c.total, 0);
  const overallAvgMs = totalAnswers > 0 ? totalTimeMs / totalAnswers : 0;

  // Flatten confusion pairs.
  const pairs = [];
  Object.keys(confusionPairs || {}).forEach(kana => {
    const romaji = characterStats[kana] ? characterStats[kana].romaji : '';
    Object.keys(confusionPairs[kana]).forEach(given => {
      pairs.push({ kana, romaji, given, count: confusionPairs[kana][given] });
    });
  });

  if (characters.length === 0) return null;

  return (
    <div className="results-charts">
      <AccuracyByCharacter characters={characters} />
      <ConfusionPairs pairs={pairs} />
      <ResponseTime characters={characters} overallAvgMs={overallAvgMs} />
    </div>
  );
}

export default ResultsCharts;
