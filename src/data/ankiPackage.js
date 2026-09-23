// Builds a real Anki package (.apkg) so the deck can carry the kanji
// pronunciation clips - the text export in ankiExport.js can't, since a
// plain file has nowhere to put media.
//
// An .apkg is a ZIP holding:
//   collection.anki2  - a SQLite database (Anki schema 11, still imported
//                       by current Anki)
//   media             - JSON map {"0": "山.mp3", ...}
//   0, 1, 2, ...      - the media files themselves, named by that index
//
// The SQLite part is why this file is loaded on demand (see ankiExport's
// dynamic import): sql.js costs ~690KB of wasm + glue, which has no
// business sitting in the install-time precache of everyone who never
// exports anything.
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm';

// Anki's own IDs are millisecond timestamps, and it relies on them being
// unique per row. A shared counter guarantees that without having to care
// how fast the loop runs.
function idFactory(start) {
  let next = start;
  return () => next++;
}

// Schema 11, as Anki creates it. Kept verbatim (rather than trimmed to what
// we insert into) because Anki opens the file expecting all of it.
const SCHEMA = `
CREATE TABLE col (
  id integer primary key, crt integer not null, mod integer not null,
  scm integer not null, ver integer not null, dty integer not null,
  usn integer not null, ls integer not null, conf text not null,
  models text not null, decks text not null, dconf text not null,
  tags text not null
);
CREATE TABLE notes (
  id integer primary key, guid text not null, mid integer not null,
  mod integer not null, usn integer not null, tags text not null,
  flds text not null, sfld integer not null, csum integer not null,
  flags integer not null, data text not null
);
CREATE TABLE cards (
  id integer primary key, nid integer not null, did integer not null,
  ord integer not null, mod integer not null, usn integer not null,
  type integer not null, queue integer not null, due integer not null,
  ivl integer not null, factor integer not null, reps integer not null,
  lapses integer not null, left integer not null, odue integer not null,
  odid integer not null, flags integer not null, data text not null
);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE TABLE revlog (
  id integer primary key, cid integer not null, usn integer not null,
  ease integer not null, ivl integer not null, lastIvl integer not null,
  factor integer not null, time integer not null, type integer not null
);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`;

// Minimal SHA-1. Anki stores csum = the first 8 hex digits of the SHA-1 of
// the sort field, as an integer, and uses it to find duplicates on import -
// get it wrong and re-importing piles up copies instead of updating. Done
// by hand rather than via crypto.subtle because that API is async and only
// available in secure contexts, neither of which suits a sync build step.
function sha1Hex(str) {
  const bytes = unescape(encodeURIComponent(str)); // UTF-8 as a byte string
  const words = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (bytes.charCodeAt(i) << (24 - (i % 4) * 8));
  }
  words[bytes.length >> 2] = (words[bytes.length >> 2] || 0) | (0x80 << (24 - (bytes.length % 4) * 8));
  words[(((bytes.length + 8) >> 6) * 16) + 15] = bytes.length * 8;

  const rol = (n, s) => (n << s) | (n >>> (32 - s));
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;

  for (let i = 0; i < words.length; i += 16) {
    const w = [];
    for (let j = 0; j < 80; j++) {
      w[j] = j < 16 ? (words[i + j] | 0) : rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      }
    let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
    for (let j = 0; j < 80; j++) {
      const f = j < 20 ? ((b & c) | (~b & d)) + 0x5A827999
              : j < 40 ? (b ^ c ^ d) + 0x6ED9EBA1
              : j < 60 ? ((b & c) | (b & d) | (c & d)) + 0x8F1BBCDC
              : (b ^ c ^ d) + 0xCA62C1D6;
      const t = (rol(a, 5) + f + e + w[j]) | 0;
      e = d; d = c; c = rol(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  return [h0, h1, h2, h3, h4].map(n => (n >>> 0).toString(16).padStart(8, '0')).join('');
}

function fieldChecksum(sortField) {
  return parseInt(sha1Hex(stripHtml(sortField)).substring(0, 8), 16);
}

// Anki checksums and sorts on the field's TEXT, not its markup.
function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}

// Stable per-note identity: re-exporting the same kanji yields the same
// guid, so Anki updates the existing note instead of adding a duplicate.
function guidFor(key) {
  return 'kq' + sha1Hex(key).substring(0, 16);
}

function noteTypeJson(modelId, deckId, css, front, back, fieldNames) {
  return {
    id: modelId,
    name: 'Kanaquiz Kanji',
    type: 0,
    mod: Math.floor(Date.now() / 1000),
    usn: -1,
    sortf: 0,
    did: deckId,
    tmpls: [{
      name: 'Recognition', ord: 0, qfmt: front, afmt: back,
      bqfmt: '', bafmt: '', did: null, bfont: '', bsize: 0
    }],
    flds: fieldNames.map((name, ord) => ({
      name, ord, sticky: false, rtl: false, font: 'Arial', size: 20,
      description: '', plainText: false, collapsed: false, excludeFromSearch: false
    })),
    css,
    latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
    latexPost: '\\end{document}',
    latexsvg: false,
    req: [[0, 'any', [0]]],
    vers: [],
    tags: []
  };
}

function deckJson(id, name) {
  return {
    id, name, mod: Math.floor(Date.now() / 1000), usn: -1,
    desc: '', dyn: 0, collapsed: false, browserCollapsed: false,
    extendNew: 0, extendRev: 50, conf: 1,
    newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0]
  };
}

const DEFAULT_CONF = {
  nextPos: 1, estTimes: true, activeDecks: [1], sortType: 'noteFld',
  timeLim: 0, sortBackwards: false, addToCur: true, curDeck: 1,
  newBury: true, newSpread: 0, dueCounts: true, curModel: null, collapseTime: 1200
};

const DEFAULT_DECK_CONF = {
  1: {
    id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true,
    timer: 0, replayq: true,
    new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20 },
    rev: { bury: true, ease4: 1.3, ivlFct: 1, maxIvl: 36500, perDay: 200, hardFactor: 1.2 },
    lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 },
    dyn: false, newMix: 0, newPerDayMinimum: 0, interdayLearningMix: 0,
    reviewOrder: 0, newSortOrder: 0, newGatherPriority: 0, buryInterdayLearning: false
  }
};

// `decks` maps deck name -> array of note objects. Each note object supplies
// the seven fields plus its tags; `media` maps a filename to its bytes.
export async function buildApkg({ decks, media, css, front, back, fieldNames, deckDescriptions }) {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const db = new SQL.Database();
  db.run(SCHEMA);

  const now = Date.now();
  const nowSec = Math.floor(now / 1000);
  // Anki counts scheduling days from the collection's creation time; this is
  // a fresh collection that only gets merged into the user's own, so any
  // sane value works - 4am today, matching Anki's own default rollover.
  const crt = Math.floor(new Date(new Date().setHours(4, 0, 0, 0)).getTime() / 1000);

  const nextId = idFactory(now);
  const modelId = nextId();

  const deckIds = {};
  const decksJson = { 1: deckJson(1, 'Default') };
  Object.keys(decks).forEach(name => {
    const id = nextId();
    deckIds[name] = id;
    const d = deckJson(id, name);
    if (deckDescriptions && deckDescriptions[name]) d.desc = deckDescriptions[name];
    decksJson[id] = d;
  });

  const modelsJson = { [modelId]: noteTypeJson(modelId, Object.values(deckIds)[0] || 1, css, front, back, fieldNames) };

  db.run(
    'INSERT INTO col VALUES (1,?,?,?,11,0,0,0,?,?,?,?,?)',
    [crt, nowSec, nowSec, JSON.stringify(DEFAULT_CONF), JSON.stringify(modelsJson),
     JSON.stringify(decksJson), JSON.stringify(DEFAULT_DECK_CONF), '{}']
  );

  const insertNote = db.prepare('INSERT INTO notes VALUES (?,?,?,?,-1,?,?,?,?,0,?)');
  const insertCard = db.prepare('INSERT INTO cards VALUES (?,?,?,0,?,-1,0,0,?,0,0,0,0,0,0,0,0,?)');

  let due = 1;
  Object.keys(decks).forEach(deckName => {
    decks[deckName].forEach(note => {
      const noteId = nextId();
      if (note.fields.length !== fieldNames.length) {
        throw new Error(
          `Anki export: note "${note.key}" has ${note.fields.length} fields but the note type declares ${fieldNames.length}`
        );
      }
      const flds = note.fields.join('\x1f');
      insertNote.run([
        noteId, guidFor(note.key), modelId, nowSec,
        ' ' + note.tags.join(' ') + ' ', // Anki stores tags space-padded
        flds, stripHtml(note.fields[0]), fieldChecksum(note.fields[0]), ''
      ]);
      insertCard.run([nextId(), noteId, deckIds[deckName], nowSec, due++, '']);
    });
  });
  insertNote.free();
  insertCard.free();

  const collection = db.export();
  db.close();

  const zip = new JSZip();
  zip.file('collection.anki2', collection);

  // Media files are stored under their index, with `media` holding the map
  // back to real names - that's how Anki avoids filename trouble inside the
  // archive (our names are kanji, so this matters).
  const mediaMap = {};
  Object.keys(media).forEach((filename, i) => {
    mediaMap[String(i)] = filename;
    zip.file(String(i), media[filename]);
  });
  zip.file('media', JSON.stringify(mediaMap));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
