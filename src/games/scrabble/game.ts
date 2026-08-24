export type PlayerIndex = 0 | 1;

export type Turn = {
  id: string;
  player: PlayerIndex;
  /** Empty for manually entered points and for end-of-game adjustments. */
  word: string;
  points: number;
  /** End-of-game rack adjustments are shown differently and can't be edited. */
  kind: 'play' | 'adjustment';
};

export type Game = {
  names: [string, string];
  turns: Turn[];
  current: PlayerIndex;
  finished: boolean;
};

export const STORAGE_KEY = 'scrabble-scorekeeper-v1';

export const newGame = (names: [string, string] = ['Player 1', 'Player 2']): Game => ({
  names,
  turns: [],
  current: 0,
  finished: false,
});

export const other = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0);

export const totalFor = (turns: Turn[], player: PlayerIndex): number =>
  turns.filter((t) => t.player === player).reduce((sum, t) => sum + t.points, 0);

export type PlayerStats = { total: number; plays: number; best: number; average: number };

export function statsFor(turns: Turn[], player: PlayerIndex): PlayerStats {
  const mine = turns.filter((t) => t.player === player);
  const plays = mine.filter((t) => t.kind === 'play');
  const total = mine.reduce((sum, t) => sum + t.points, 0);
  const best = plays.reduce((max, t) => Math.max(max, t.points), 0);
  const scored = plays.reduce((sum, t) => sum + t.points, 0);
  return {
    total,
    plays: plays.length,
    best,
    average: plays.length ? Math.round((scored / plays.length) * 10) / 10 : 0,
  };
}

/** Index of the leader, or null when the game is tied. */
export function leader(turns: Turn[]): PlayerIndex | null {
  const a = totalFor(turns, 0);
  const b = totalFor(turns, 1);
  if (a === b) return null;
  return a > b ? 0 : 1;
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
