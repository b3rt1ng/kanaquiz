import { kanaDictionary } from './kanaDictionary';

export function arrayContains(needle, haystack) {
    return (haystack.indexOf(needle) > -1) ? true : false;
}

// Kana keys drawn from the character groups the user selected on the menu
// screen - the same selection used to start Stage 1-4 / the Table / the
// Listening exercise. A character can end up here via more than one selected
// group (e.g. its base group and a "look-alike" group both selected); callers
// that key an object by kana (like TableExercise's cells) dedupe that naturally.
export function getSelectedKanaKeys(kanaType, decidedGroups) {
    const keys = [];
    Object.keys(kanaDictionary[kanaType]).forEach(groupName => {
        if(arrayContains(groupName, decidedGroups)) {
            keys.push(...Object.keys(kanaDictionary[kanaType][groupName].characters));
        }
    });
    return keys;
}

export function removeFromArray(needle, haystack) {
    if(typeof needle === 'object')
        needle = needle[0];

    if(arrayContains(needle, haystack)) {
        haystack.splice(haystack.indexOf(needle), 1);
    }
    return haystack;
}

export function findRomajisAtKanaKey(needle, kanaDictionary) {
    let romaji = [];
    Object.keys(kanaDictionary).map(function(whichKana) {
    // console.log(whichKana); // 'hiragana' or 'katakana'
        Object.keys(kanaDictionary[whichKana]).map(function(groupName) {
            // console.log(groupName); // 'h_group1', ...
            Object.keys(kanaDictionary[whichKana][groupName]['characters']).map(function(key) {
                if(key==needle) {
                    // console.log(kanaDictionary[whichKana][groupName]['characters'][key]);
                    romaji = kanaDictionary[whichKana][groupName]['characters'][key];
                }
            }, this);
        }, this);
    }, this);
    // console.log(romaji);
    return romaji;
}

    // whichKanaTypeIsThis(character, kanaDictionary) { // in case if needed later
    //     let type = null;
    //     Object.keys(kanaDictionary).map(function(whichKana) {
    //         Object.keys(kanaDictionary[whichKana]).map(function(groupName) {
    //             Object.keys(kanaDictionary[whichKana][groupName]['characters']).map(function(key) {
    //                 if(key==character) {
    //                     type = whichKana;
    //                 }
    //             }, this);
    //         }, this);
    //     }, this);
    //     return type;       
    // }

// Aligns a typed romaji string to a sequence of kana (each described by its
// list of acceptable romaji) and returns a per-kana breakdown:
//   [{ index, given, correct }, ...]
// Used for stage 4 (multi-character words) so a wrong answer can be attributed
// to the individual characters that were missed, and to what was typed instead.
// Returns null when no alignment consumes the whole input.
export function alignAnswer(romajiLists, input) {
    const memo = new Map();

    function best(i, pos) {
        if (i === romajiLists.length)
            return pos === input.length ? { score: 0, seq: [] } : null;

        const key = i + ':' + pos;
        if (memo.has(key)) return memo.get(key);

        let bestRes = null;
        const consider = (given, correct, nextPos) => {
            const sub = best(i + 1, nextPos);
            if (sub === null) return;
            const inc = correct ? 10 : (given === '' ? -3 : -1);
            const total = inc + sub.score;
            if (bestRes === null || total > bestRes.score) {
                bestRes = {
                    score: total,
                    seq: [{ index: i, given: given, correct: correct }].concat(sub.seq)
                };
            }
        };

        const allowed = romajiLists[i];
        // Prefer correct matches, longest romaji first (avoids greedy mis-splits).
        allowed.slice().sort((a, b) => b.length - a.length).forEach(r => {
            if (r.length > 0 && input.substr(pos, r.length) === r)
                consider(r, true, pos + r.length);
        });
        // Otherwise the user typed something wrong here: try 0..3 characters.
        const maxLen = Math.min(3, input.length - pos);
        for (let len = 0; len <= maxLen; len++) {
            const given = input.substr(pos, len);
            if (allowed.indexOf(given) !== -1) continue; // already tried as correct
            consider(given, false, pos + len);
        }

        memo.set(key, bestRes);
        return bestRes;
    }

    const res = best(0, 0);
    return res ? res.seq : null;
}

export function shuffle(array) {
    var i = 0
        , j = 0
        , temp = null

    for (i = array.length - 1; i > 0; i -= 1) {
        j = Math.floor(Math.random() * (i + 1))
        temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
}

export function removeHash () { 
    var loc = window.location;
    if ("pushState" in history)
        history.replaceState("", document.title, loc.pathname + loc.search);

}

export function getRandomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function cartesianProduct(elements) {
    if (!Array.isArray(elements)) {
        throw new TypeError();
    }

    var end = elements.length - 1,
    result = [];

    function addTo(curr, start) {
        var first = elements[start],
            last = (start === end);

        for (var i = 0; i < first.length; ++i) {
            var copy = curr.slice();
            copy.push(first[i]);

            if (last) {
                result.push(copy);
            } else {
                addTo(copy, start + 1);
            }
        }
    }

    if (elements.length) {
        addTo([], 0);
    } else {
        result.push([]);
    }
    return result;
}