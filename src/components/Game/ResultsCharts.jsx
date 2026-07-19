import React from 'react';
import './ResultsCharts.scss';

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

function ResultsCharts({ characterStats, confusionPairs }) {
  if (Object.keys(characterStats || {}).length === 0) return null;

  // Flatten confusion pairs.
  const pairs = [];
  Object.keys(confusionPairs || {}).forEach(kana => {
    const romaji = characterStats[kana] ? characterStats[kana].romaji : '';
    Object.keys(confusionPairs[kana]).forEach(given => {
      pairs.push({ kana, romaji, given, count: confusionPairs[kana][given] });
    });
  });

  return (
    <div className="results-charts">
      <ConfusionPairs pairs={pairs} />
    </div>
  );
}

export default ResultsCharts;
