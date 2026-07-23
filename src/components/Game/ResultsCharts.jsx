import React from 'react';
import './ResultsCharts.scss';

// Grouped by character (not a flat top-N list of individual mistakes) so
// that getting the SAME character wrong in several DIFFERENT ways - a
// typo one time, a totally different guess another - shows every one of
// them under that character instead of only the single most common one
// surviving a global top-N cut.
function ConfusionPairs({ groups }) {
  if (groups.length === 0) {
    return (
      <div className="chart-card">
        <h4 className="chart-title">Confusion Pairs</h4>
        <p className="chart-sub empty">No confusion - flawless! 🎉</p>
      </div>
    );
  }

  // Characters missed the most (across however many ways) lead - still
  // capped, but per-CHARACTER now, not per individual mistake, so a
  // character with many different wrong answers doesn't have some of
  // them silently dropped in favor of an unrelated character's single
  // frequent one.
  const top = groups.slice().sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="chart-card">
      <h4 className="chart-title">Confusion Pairs</h4>
      <p className="chart-sub">What you answered instead of the correct answer - every way you missed it.</p>
      <div className="confusion-groups">
        {top.map((g, i) => (
          <div className="confusion-group" key={i}>
            <span className="confusion-q">
              <span className="confusion-glyph">{g.kana}</span>
              <span className="confusion-correct">{g.romaji}</span>
            </span>
            <span className="confusion-givens">
              {g.givens.map((gv, j) => (
                <span className="confusion-given-chip" key={j}>« {gv.given} »{gv.count > 1 && <span className="confusion-count"> ×{gv.count}</span>}</span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsCharts({ characterStats, confusionPairs }) {
  if (Object.keys(characterStats || {}).length === 0) return null;

  const groups = Object.keys(confusionPairs || {}).map(kana => {
    const romaji = characterStats[kana] ? characterStats[kana].romaji : '';
    const givens = Object.keys(confusionPairs[kana])
      .map(given => ({ given, count: confusionPairs[kana][given] }))
      .sort((a, b) => b.count - a.count);
    const total = givens.reduce((sum, gv) => sum + gv.count, 0);
    return { kana, romaji, givens, total };
  });

  return (
    <div className="results-charts">
      <ConfusionPairs groups={groups} />
    </div>
  );
}

export default ResultsCharts;
