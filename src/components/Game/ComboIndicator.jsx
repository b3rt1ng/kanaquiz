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

const KANJI_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const KANJI_UNITS = ['', '十', '百', '千'];

// Renders a positive integer as kanji numerals (15 -> 十五, 104 -> 百四..).
function toKanjiNumeral(num) {
  if (num <= 0) return '〇';

  const str = String(num);
  const len = str.length;
  let result = '';

  for (let i = 0; i < len; i++) {
    const digit = parseInt(str[i], 10);
    const unitIndex = len - i - 1;
    if (digit === 0) continue;
    // "十" not "一十" for 10, but "十一" keeps its 一 in the ones place.
    result += (digit === 1 && unitIndex > 0) ? KANJI_UNITS[unitIndex] : KANJI_DIGITS[digit] + KANJI_UNITS[unitIndex];
  }

  return result;
}

function ComboIndicator({ combo }) {
  if (!combo || combo < 1) return null;

  const tier = getTier(combo);
  const scale = Math.min(1 + (combo - 1) * 0.09, 3.2);
  const isMilestone = combo % 5 === 0;
  const style = { '--combo-scale': scale };

  return (
    <div className="combo-root">
      <div className={`combo-indicator combo-tier-${tier}${combo >= 10 ? ' ca-unstable' : ''}`} style={style}>
        <span className="combo-ring"></span>
        <span className="combo-x">×{toKanjiNumeral(combo)}</span>
      </div>
      {isMilestone && <div className="combo-flash"></div>}
    </div>
  );
}

export default ComboIndicator;
