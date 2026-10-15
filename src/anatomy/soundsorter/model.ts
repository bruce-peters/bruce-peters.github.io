// What the sound sorter shows. One sentence, the sounds each word needs, four
// readings of it, and the feedback rules the backend applies to them. The
// figure's build script (scripts/anatomy/sound-sorter/build.mjs) and the live
// code both read this file, so the drawing and the animation can't disagree.

/** "The dog ran." in the IPA the phoneme model writes, one entry per sound box. */
export const SENTENCE = "The dog ran.";
export const WORDS = [
  { text: "The", sounds: ["ð", "ə"] },
  { text: "dog", sounds: ["d", "ɔ", "g"] },
  { text: "ran", sounds: ["r", "æ", "n"] },
];

/** One shape per sound, like the blocks of a shape sorter. */
export const SHAPE_OF: Record<string, string> = {
  ð: "diamond",
  ə: "circle",
  d: "plus",
  ɔ: "star",
  g: "pentagon",
  r: "triangle",
  æ: "square",
  n: "hexagon",
  ɪ: "half",
  w: "kite",
  ɑ: "oval",
  z: "trapezoid",
};

export interface Reading {
  said: string;
  /** What the aligner lined up against each sound box, in order. */
  heard: string[];
}

/**
 * Four readings, each showing one branch of generate_feedback in
 * backend/core/phoneme_feedback_formatter.py. Their feedback was checked
 * against that function.
 */
export const READINGS: Reading[] = [
  { said: "The dog ran.", heard: ["ð", "ə", "d", "ɔ", "g", "r", "æ", "n"] },
  { said: "The dog run.", heard: ["ð", "ə", "d", "ɔ", "g", "r", "ə", "n"] },
  { said: "The dig run.", heard: ["ð", "ə", "d", "ɪ", "g", "r", "ə", "n"] },
  { said: "The dog was.", heard: ["ð", "ə", "d", "ɔ", "g", "w", "ɑ", "z"] },
];

// backend/core/phoneme_feedback_formatter.py
export const MIN_FOCUS_ERRORS = 3; // a word is clearly wrong at 3 wrong sounds
export const MIN_PATTERN_WORDS = 3; // or one sound is wrong in 3 different words
export const PRAISE_PER = 0.2; // "Great job!" at a sentence PER of 0.2 or less

// frontend/src/components/WordBadge.tsx
export type Band = "good" | "close" | "practice";
export const bandOf = (per: number): Band => (per < 0.15 ? "good" : per < 0.5 ? "close" : "practice");

/** The sound boxes in sentence order. */
export const BOXES = WORDS.flatMap((word, w) => word.sounds.map((ipa, index) => ({ word: w, index, ipa })));

export interface WordScore {
  text: string;
  errors: number;
  total: number;
  wrong: string[];
  per: number;
  band: Band;
  clear: boolean;
}

export interface Score {
  words: WordScore[];
  errors: number;
  sentencePer: number;
  /** The spoken feedback, word for word. */
  says: string;
  /** The same feedback, short enough for the tablet's screen. */
  short: string;
  focus: string | null;
}

// The letters, sound name and tip the formatter uses for the one sound named here.
const LETTERS: Record<string, string> = { r: "r" };
const NAME: Record<string, string> = { r: "r" };
const TIP: Record<string, string> = {
  r: "For the ‘r’ sound, curl your tongue back slightly without touching the roof of your mouth.",
};

/** Score a reading the way the backend does for these cases. */
export function scoreReading(heard: string[]): Score {
  const words: WordScore[] = WORDS.map((word) => ({ text: word.text, errors: 0, total: word.sounds.length, wrong: [], per: 0, band: "good", clear: false }));
  BOXES.forEach((box, i) => {
    if (heard[i] === box.ipa) return;
    words[box.word].errors++;
    words[box.word].wrong.push(box.ipa);
  });
  for (const word of words) {
    word.per = word.errors / word.total;
    word.band = bandOf(word.per);
    word.clear = word.errors >= MIN_FOCUS_ERRORS;
  }
  const errors = words.reduce((sum, word) => sum + word.errors, 0);
  const sentencePer = errors / BOXES.length;
  let says = "Great job!";
  let short = "Great job!";
  let focus: string | null = null;
  const worst = words.filter((word) => word.clear).sort((a, b) => b.errors - a.errors || b.per - a.per)[0];
  if (worst) {
    // The word's own wrong sounds, the most frequent first, then the earliest in the word.
    const sounds = WORDS[words.indexOf(worst)].sounds;
    const counts = new Map<string, number>();
    for (const ipa of worst.wrong) counts.set(ipa, (counts.get(ipa) ?? 0) + 1);
    focus = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || sounds.indexOf(a) - sounds.indexOf(b))[0];
    const name = NAME[focus] ?? focus;
    says = `In the word ‘${worst.text}’, the letters ‘${LETTERS[focus] ?? focus}’ make the ‘${name}’ sound.`;
    if (TIP[focus]) says += ` ${TIP[focus]}`;
    short = `The ‘${name}’ in ‘${worst.text}’`;
  } else {
    const byWords = new Map<string, Set<string>>();
    words.forEach((word) => word.wrong.forEach((ipa) => byWords.set(ipa, new Set([...(byWords.get(ipa) ?? []), word.text]))));
    const pattern = [...byWords].find(([, names]) => names.size >= MIN_PATTERN_WORDS);
    if (pattern) {
      says = `Watch the ‘${NAME[pattern[0]] ?? pattern[0]}’ sound in ${[...pattern[1]].join(", ")}.`;
      short = `Watch the ‘${NAME[pattern[0]] ?? pattern[0]}’ sound`;
    } else if (errors && sentencePer > PRAISE_PER) {
      says = "Keep practicing!";
      short = says;
    }
  }
  return { words, errors, sentencePer, says, short, focus };
}
