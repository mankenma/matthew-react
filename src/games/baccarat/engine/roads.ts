// Scoreboard data models: bead plate + big road. Extensible toward derived roads (v2).

import type { Winner } from './rules';

export interface RoadEntry {
  winner: Winner;
  playerPair: boolean;
  bankerPair: boolean;
  playerTotal: number;
  bankerTotal: number;
}

// ---- bead plate -------------------------------------------------------------
// The bead plate is simply the ordered list; the UI lays it out column-major in 6 rows.
export type BeadPlate = RoadEntry[];

// ---- big road ---------------------------------------------------------------

export interface BigRoadCell {
  winner: 'Player' | 'Banker';
  ties: number; // tie marks accumulated on this cell
}

export const BIG_ROAD_ROWS = 6;

export interface BigRoad {
  // columns[col][row] -> cell
  columns: BigRoadCell[][];
  // ties that occurred before any decisive result
  leadingTies: number;
}

// Build the big road from scratch (kept simple + deterministic; recomputed on change).
export function buildBigRoad(entries: RoadEntry[]): BigRoad {
  const columns: BigRoadCell[][] = [];
  let leadingTies = 0;

  // Track placement of the last decisive cell for tie annotation and stacking.
  let lastCol = -1;
  let lastRow = -1;

  const occupied = new Set<string>(); // "col,row"
  const key = (c: number, r: number) => `${c},${r}`;

  for (const e of entries) {
    if (e.winner === 'Tie') {
      if (lastCol < 0) {
        leadingTies++;
      } else {
        columns[lastCol][lastRow].ties++;
      }
      continue;
    }

    const w = e.winner; // 'Player' | 'Banker'

    if (lastCol < 0) {
      // first decisive result
      columns.push([{ winner: w, ties: 0 }]);
      lastCol = 0;
      lastRow = 0;
      occupied.add(key(0, 0));
      continue;
    }

    const prevWinner = columns[lastCol][lastRow].winner;
    if (prevWinner === w) {
      // continue the streak: try to go down one row in the same column
      let targetCol = lastCol;
      let targetRow = lastRow + 1;
      if (targetRow >= BIG_ROAD_ROWS || occupied.has(key(targetCol, targetRow))) {
        // turn right (dragon tail)
        targetCol = lastCol + 1;
        targetRow = lastRow;
        while (occupied.has(key(targetCol, targetRow))) targetCol++;
      }
      if (!columns[targetCol]) columns[targetCol] = [];
      columns[targetCol][targetRow] = { winner: w, ties: 0 };
      occupied.add(key(targetCol, targetRow));
      lastCol = targetCol;
      lastRow = targetRow;
    } else {
      // streak broken: start a new column at row 0
      const newCol = columns.length;
      columns[newCol] = [];
      columns[newCol][0] = { winner: w, ties: 0 };
      occupied.add(key(newCol, 0));
      lastCol = newCol;
      lastRow = 0;
    }
  }

  return { columns, leadingTies };
}

// Convenience stats for the optional "myth check".
export interface RoadStats {
  total: number;
  banker: number;
  player: number;
  tie: number;
  bankerPct: number;
  playerPct: number;
  tiePct: number;
  longestStreak: number;
}

export function roadStats(entries: RoadEntry[]): RoadStats {
  let banker = 0,
    player = 0,
    tie = 0;
  let longestStreak = 0,
    cur = 0;
  let prev: Winner | null = null;
  for (const e of entries) {
    if (e.winner === 'Banker') banker++;
    else if (e.winner === 'Player') player++;
    else tie++;
    if (e.winner !== 'Tie') {
      if (e.winner === prev) cur++;
      else cur = 1;
      prev = e.winner;
      if (cur > longestStreak) longestStreak = cur;
    }
  }
  const total = entries.length;
  const pct = (n: number) => (total ? (100 * n) / total : 0);
  return {
    total,
    banker,
    player,
    tie,
    bankerPct: pct(banker),
    playerPct: pct(player),
    tiePct: pct(tie),
    longestStreak,
  };
}
