import React from 'react';
import './ComplimentPopup.scss';

const COLORS = ['coral', 'pink', 'orange', 'success'];
const ZONES = ['left', 'right', 'bottom'];

// Never dead center, so it doesn't cover the kana being tested.
function randomZonePosition() {
  const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
  if (zone === 'bottom') {
    // Narrower spawn band on small screens: the bottom zone is centered
    // (not edge-anchored, see ComplimentPopup.scss), so it has no "grow
    // inward" trick available - it needs the position itself kept away
    // from the edges to leave room for the pop-in animation's peak scale.
    const narrow = typeof window !== 'undefined' && window.innerWidth <= 768;
    return narrow
      ? { zone, horizontal: 25 + Math.random() * 50, vertical: 76 + Math.random() * 12 }
      : { zone, horizontal: 15 + Math.random() * 70, vertical: 76 + Math.random() * 12 };
  }
  if (zone === 'right') {
    // Keep clear of the combo indicator's 32-58% vertical band on this edge.
    const upper = Math.random() < 0.5;
    const vertical = upper ? 10 + Math.random() * 18 : 62 + Math.random() * 18;
    return { zone, horizontal: 3 + Math.random() * 8, vertical };
  }
  return { zone, horizontal: 3 + Math.random() * 8, vertical: 14 + Math.random() * 58 };
}

function ComplimentPopup({ compliment }) {
  if (!compliment) return null;

  const { text, romaji, color, zone, horizontal, vertical, combo } = compliment;

  const style = { top: vertical + '%' };
  if (zone === 'left') style.left = horizontal + 'vw';
  else if (zone === 'right') style.right = horizontal + 'vw';
  else style.left = horizontal + '%';

  const popClass = `compliment-pop compliment-${color}` + (combo >= 10 ? ' ca-unstable' : '');

  return (
    <div className={`compliment-root compliment-zone-${zone}`} style={style}>
      <div className={popClass}>
        <span className="compliment-shockwave"></span>
        <span className="compliment-flash"></span>
        <span className="compliment-text">{text}</span>
        <span className="compliment-romaji">{romaji}</span>
      </div>
    </div>
  );
}

export function buildCompliment({ text, romaji }, combo) {
  return {
    text,
    romaji,
    combo,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    ...randomZonePosition()
  };
}

export default ComplimentPopup;
