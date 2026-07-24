// Shared "Grind them" mechanic - composed into an exercise (as
// `this.grinder = new GrindHelper()`), not inherited. Each exercise keeps
// its own component shape (Question's 4 stages, Table's grid, Kanji's flip
// card, ...) and just delegates the bits that are identical everywhere:
// tracking how many correct answers a key has banked, and deciding whether
// it needs to come back around again before the session can end.
import { shuffle } from './helperFuncs';

// A grind session needs this many correct answers per key (not just one)
// before it's considered mastered - see recordAnswer().
const GRIND_MASTERY_NEEDED = 2;

export class GrindHelper {
  constructor() {
    this.active = false;
    this.masteryCount = {};
    // The key list a grind session was started with - kept so retry() can
    // re-launch the same grind instead of falling back to a fresh session.
    this.keys = null;
  }

  // Begins a grind session: shuffles `items` in place (same items the
  // caller already resolved from `keys` - resolving keys into whatever
  // shape a given exercise's deck uses is exercise-specific, so that part
  // stays with the caller) and returns them back for convenience.
  start(items, keys) {
    this.active = true;
    this.masteryCount = {};
    this.keys = keys;
    shuffle(items);
    return items;
  }

  // Leaves grind mode for good - call this when starting a brand new,
  // non-grind session so a stale grind state can't linger.
  reset() {
    this.active = false;
    this.masteryCount = {};
    this.keys = null;
  }

  masteryNeeded() {
    return this.active ? GRIND_MASTERY_NEEDED : 1;
  }

  // How many correct answers the WHOLE session needs before it's done -
  // e.g. 6 confused keys in grind mode -> 12, or just `totalCards` outside
  // grind mode (1 each).
  progressTarget(totalCards) {
    return totalCards * this.masteryNeeded();
  }

  // Records one answer for `key`. Returns:
  // - justMastered: this answer was correct and reached the needed count
  //   (always true outside grind mode, on the first and only correct try)
  // - shouldRequeue: the grind mechanic itself wants `key` tested again -
  //   either it was wrong, or it was correct but hasn't reached
  //   GRIND_MASTERY_NEEDED yet. Callers with their OWN retry policy for
  //   wrong answers outside grind mode (e.g. Kanji's "Correct Later"
  //   toggle) should OR this in with that, rather than relying on it for
  //   non-grind wrong answers - this only ever fires while active.
  recordAnswer(key, isCorrect) {
    let justMastered = false;
    if (isCorrect) {
      const needed = this.masteryNeeded();
      const count = (this.masteryCount[key] || 0) + 1;
      this.masteryCount[key] = count;
      justMastered = count >= needed;
    }
    const shouldRequeue = this.active && (!isCorrect || !justMastered);
    return { justMastered, shouldRequeue };
  }
}

// Re-inserts `item` at a random position strictly after `index` in `array`
// (mutates in place, never immediately next so it doesn't just test
// short-term memory) - used to bring a missed or under-mastered item back
// later in the same session.
export function requeueAfter(array, index, item) {
  const from = index + 1;
  const insertAt = from + Math.floor(Math.random() * (array.length - from + 1));
  array.splice(insertAt, 0, item);
}
