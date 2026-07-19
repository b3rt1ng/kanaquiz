import React from 'react';
import './ComboIndicator.scss';

// Escalating tiers so the effect gets visibly more "powerful" the longer
// the streak runs, on top of the continuous size growth below.
function getTier(combo) {
  if (combo >= 15) return 5;
  if (combo >= 10) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

function ComboIndicator({ combo }) {
  if (!combo || combo < 1) return null;

  const tier = getTier(combo);
  const scale = Math.min(1 + (combo - 1) * 0.05, 2.4);
  const isMilestone = combo % 5 === 0;

  return (
    <div className="combo-root">
      <div className={`combo-indicator combo-tier-${tier}`} style={{ '--combo-scale': scale }}>
        <span className="combo-ring"></span>
        <span className="combo-x">×{combo}</span>
      </div>
      {isMilestone && <div className="combo-flash"></div>}
    </div>
  );
}

export default ComboIndicator;
