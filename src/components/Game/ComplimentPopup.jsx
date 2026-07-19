import React from 'react';
import './ComplimentPopup.scss';

const COLORS = ['coral', 'pink', 'orange', 'success'];
const ZONES = ['left', 'right', 'bottom'];

// Never dead center, so it doesn't cover the kana being tested.
function randomZonePosition() {
  const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
  if (zone === 'bottom') {
    return { zone, horizontal: 15 + Math.random() * 70, vertical: 76 + Math.random() * 12 };
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

  const caOffset = Math.min((combo || 0) * 0.4, 8);
  const popStyle = { '--ca-offset': caOffset + 'px' };
  const popClass = `compliment-pop compliment-${color}` + (combo >= 10 ? ' ca-unstable' : '');

  return (
    <div className={`compliment-root compliment-zone-${zone}`} style={style}>
      <div className={popClass} style={popStyle}>
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
