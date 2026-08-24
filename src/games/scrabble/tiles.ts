// Standard English Scrabble tile values. Blanks ('?') are worth nothing but
// still ride along with any word multiplier.
export const TILE_VALUES: Record<string, number> = {
  A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, S: 1, T: 1, R: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
  F: 4, H: 4, V: 4, W: 4, Y: 4,
  K: 5,
  J: 8, X: 8,
  Q: 10, Z: 10,
};

export const BINGO_BONUS = 50;
export const BINGO_TILE_COUNT = 7;

/** Premium square applied to a single tile. */
export type LetterMod = 'none' | 'DL' | 'TL' | 'blank';

export type ScoredLetter = { letter: string; mod: LetterMod };

const LETTER_MULTIPLIER: Record<LetterMod, number> = { none: 1, DL: 2, TL: 3, blank: 0 };

/** Turns raw typed text into tiles, dropping anything that isn't a letter or a blank. */
export function parseWord(raw: string): string[] {
  return raw
    .toUpperCase()
    .split('')
    .filter((c) => c === '?' || (c >= 'A' && c <= 'Z'));
}

export function tileValue(letter: string): number {
  return TILE_VALUES[letter.toUpperCase()] ?? 0;
}

export function letterScore({ letter, mod }: ScoredLetter): number {
  return tileValue(letter) * LETTER_MULTIPLIER[mod];
}

/** Word score: letters (with their premium squares) × word multiplier, plus any bingo. */
export function scoreWord(letters: ScoredLetter[], wordMultiplier: number, bingo: boolean): number {
  const base = letters.reduce((sum, l) => sum + letterScore(l), 0);
  return base * wordMultiplier + (bingo ? BINGO_BONUS : 0);
}

/** Face value of the tiles left on a rack. '?' (blank) counts as zero. */
export function rackValue(rack: string): number {
  return parseWord(rack).reduce((sum, letter) => sum + tileValue(letter), 0);
}

/**
 * End-of-game adjustments. The player who goes out adds the value of the
 * opponent's unplayed tiles; everyone still holding tiles subtracts their own.
 */
export function endGameAdjustments(rackA: string, rackB: string): [number, number] {
  const a = rackValue(rackA);
  const b = rackValue(rackB);
  const aOut = parseWord(rackA).length === 0;
  const bOut = parseWord(rackB).length === 0;

  if (aOut && !bOut) return [b, -b];
  if (bOut && !aOut) return [-a, a];
  if (aOut && bOut) return [0, 0];
  return [-a, -b];
}
