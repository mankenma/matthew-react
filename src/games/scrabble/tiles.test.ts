import { describe, it, expect } from 'vitest';
import type { LetterMod, ScoredLetter } from './tiles';
import { BINGO_BONUS, endGameAdjustments, parseWord, rackValue, scoreWord, tileValue } from './tiles';

// ---- helpers ----------------------------------------------------------------

// Build tiles from a word, optionally modding specific positions: mods('QUIZ', {0:'TL'})
function tiles(word: string, mods: Record<number, LetterMod> = {}): ScoredLetter[] {
  return parseWord(word).map((letter, i) => ({ letter, mod: mods[i] ?? 'none' }));
}

// ---- tile values ------------------------------------------------------------

describe('tileValue', () => {
  it('scores the standard English distribution', () => {
    expect(tileValue('A')).toBe(1);
    expect(tileValue('D')).toBe(2);
    expect(tileValue('B')).toBe(3);
    expect(tileValue('H')).toBe(4);
    expect(tileValue('K')).toBe(5);
    expect(tileValue('X')).toBe(8);
    expect(tileValue('Q')).toBe(10);
  });

  it('is case insensitive and treats blanks as zero', () => {
    expect(tileValue('q')).toBe(10);
    expect(tileValue('?')).toBe(0);
  });
});

describe('parseWord', () => {
  it('uppercases letters and keeps blanks', () => {
    expect(parseWord('qu?z')).toEqual(['Q', 'U', '?', 'Z']);
  });

  it('drops spaces, digits and punctuation', () => {
    expect(parseWord('ca t-1!')).toEqual(['C', 'A', 'T']);
  });
});

// ---- word scoring -----------------------------------------------------------

describe('scoreWord', () => {
  it('sums plain tile values', () => {
    expect(scoreWord(tiles('CAT'), 1, false)).toBe(5);
  });

  it('applies letter premiums before the word multiplier', () => {
    // Q on a triple letter (30) + U + I + Z, all doubled = (30+1+1+10) * 2
    expect(scoreWord(tiles('QUIZ', { 0: 'TL' }), 2, false)).toBe(84);
  });

  it('gives blanks no face value but still multiplies the word', () => {
    // ?AT -> (0 + 1 + 1) * 3
    expect(scoreWord(tiles('?AT'), 3, false)).toBe(6);
  });

  it('adds the bingo bonus after multipliers', () => {
    const plain = scoreWord(tiles('FRIENDS'), 2, false);
    expect(scoreWord(tiles('FRIENDS'), 2, true)).toBe(plain + BINGO_BONUS);
  });

  it('scores an empty rack as nothing', () => {
    expect(scoreWord([], 3, false)).toBe(0);
  });
});

// ---- end of game ------------------------------------------------------------

describe('rackValue', () => {
  it('adds up leftover tiles, ignoring blanks', () => {
    expect(rackValue('QZ?')).toBe(20);
  });

  it('is zero for an empty rack', () => {
    expect(rackValue('')).toBe(0);
  });
});

describe('endGameAdjustments', () => {
  it('credits the player who goes out with the opponent leftovers', () => {
    expect(endGameAdjustments('', 'QU')).toEqual([11, -11]);
    expect(endGameAdjustments('DOG', '')).toEqual([-5, 5]);
  });

  it('subtracts both racks when neither player goes out', () => {
    expect(endGameAdjustments('AD', 'K')).toEqual([-3, -5]);
  });

  it('is a no-op when both racks are empty', () => {
    expect(endGameAdjustments('', '')).toEqual([0, 0]);
  });
});
