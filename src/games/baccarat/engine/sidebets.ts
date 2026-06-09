// Side-bet catalog + pure resolution. Everything resolves from a HandResolution.

import type { HandResolution } from './rules';

export type SideBetId =
  | 'playerPair'
  | 'bankerPair'
  | 'eitherPair'
  | 'perfectPair'
  | 'smallTiger'
  | 'bigTiger'
  | 'tiger'
  | 'tigerPair'
  | 'tigerTie'
  | 'lucky6'
  | 'super6'
  | 'lucky7'
  | 'superLucky7';

export type SideBetFamily = 'pair' | 'tiger' | 'six' | 'seven';

export interface SideBetConfig {
  perfectPairPay: 25 | 26 | 27 | 28; // default 25
  smallTigerPay: 20 | 22 | 23; // default 22
  super6Pay: 12 | 13 | 14 | 15 | 16 | 17; // default 12
}

export const defaultSideBetConfig: SideBetConfig = {
  perfectPairPay: 25,
  smallTigerPay: 22,
  super6Pay: 12,
};

// House edges keyed by the configurable payout (8-deck), for display/coaching.
export const PERFECT_PAIR_EDGES: Record<number, number> = {
  25: 13.03,
  26: 9.68,
  27: 6.34,
  28: 2.99,
};
export const SMALL_TIGER_EDGES: Record<number, number> = {
  20: 21.78,
  22: 14.33,
  23: 10.61,
};
export const SUPER6_EDGES: Record<number, number> = {
  12: 29.98,
  13: 24.59,
  14: 19.2,
  15: 13.82,
  16: 8.43,
  17: 3.05,
};

export interface SideBetResult {
  won: boolean;
  // Payout multiple to 1 (profit per unit staked). 0 when the bet loses.
  payout: number;
  // Human-readable tag for the deciding factor (e.g. "three-card 6", "Twin").
  detail: string;
}

const LOSS: SideBetResult = { won: false, payout: 0, detail: '' };

// ---- individual win conditions ----------------------------------------------

function resolvePlayerPair(r: HandResolution): SideBetResult {
  return r.player.pair.isPair
    ? { won: true, payout: 11, detail: `Player pair of ${r.player.pair.rank}s` }
    : LOSS;
}

function resolveBankerPair(r: HandResolution): SideBetResult {
  return r.banker.pair.isPair
    ? { won: true, payout: 11, detail: `Banker pair of ${r.banker.pair.rank}s` }
    : LOSS;
}

function resolveEitherPair(r: HandResolution): SideBetResult {
  return r.player.pair.isPair || r.banker.pair.isPair
    ? { won: true, payout: 5, detail: 'a hand paired' }
    : LOSS;
}

function resolvePerfectPair(r: HandResolution, cfg: SideBetConfig): SideBetResult {
  if (r.player.pair.isPerfect || r.banker.pair.isPerfect) {
    return { won: true, payout: cfg.perfectPairPay, detail: 'rank + suit pair' };
  }
  return LOSS;
}

function bankerWinsWithSix(r: HandResolution): boolean {
  return r.winner === 'Banker' && r.banker.total === 6;
}

function resolveSmallTiger(r: HandResolution, cfg: SideBetConfig): SideBetResult {
  if (bankerWinsWithSix(r) && r.banker.cards.length === 2) {
    return { won: true, payout: cfg.smallTigerPay, detail: 'two-card Banker 6' };
  }
  return LOSS;
}

function resolveBigTiger(r: HandResolution): SideBetResult {
  if (bankerWinsWithSix(r) && r.banker.cards.length === 3) {
    return { won: true, payout: 50, detail: 'three-card Banker 6' };
  }
  return LOSS;
}

// Tiger / Lucky 6 share the exact same event and schedule: 12:1 two-card, 20:1 three-card.
function resolveSixSplit(r: HandResolution): SideBetResult {
  if (!bankerWinsWithSix(r)) return LOSS;
  const threeCard = r.banker.cards.length === 3;
  return {
    won: true,
    payout: threeCard ? 20 : 12,
    detail: threeCard ? 'three-card Banker 6' : 'two-card Banker 6',
  };
}

function resolveSuper6(r: HandResolution, cfg: SideBetConfig): SideBetResult {
  // Same event as Lucky 6, but a single flat payout regardless of card count.
  if (!bankerWinsWithSix(r)) return LOSS;
  return { won: true, payout: cfg.super6Pay, detail: 'Banker 6 (flat)' };
}

function resolveTigerPair(r: HandResolution): SideBetResult {
  const p = r.player.pair;
  const b = r.banker.pair;
  if (!p.isPair && !b.isPair) return LOSS;
  if (p.isPair && b.isPair) {
    if (p.rank === b.rank) {
      return { won: true, payout: 100, detail: 'Twin (same pair both hands)' };
    }
    return { won: true, payout: 20, detail: 'Double (both hands pair)' };
  }
  return { won: true, payout: 4, detail: 'Single (one hand pairs)' };
}

function resolveTigerTie(r: HandResolution): SideBetResult {
  if (r.winner === 'Tie' && r.player.total === 6 && r.banker.total === 6) {
    return { won: true, payout: 35, detail: '6-6 tie' };
  }
  return LOSS;
}

function resolveLucky7(r: HandResolution): SideBetResult {
  if (r.winner === 'Player' && r.player.total === 7) {
    const threeCard = r.player.cards.length === 3;
    return {
      won: true,
      payout: threeCard ? 15 : 6,
      detail: threeCard ? 'three-card Player 7' : 'two-card Player 7',
    };
  }
  return LOSS;
}

function resolveSuperLucky7(r: HandResolution): SideBetResult {
  // Player wins with 7 versus a Banker 6. Top payout (six-card version) pays 100:1.
  // Edge is not published; we never display a fabricated figure.
  if (r.winner === 'Player' && r.player.total === 7 && r.banker.total === 6) {
    return { won: true, payout: 100, detail: 'Player 7 vs Banker 6' };
  }
  return LOSS;
}

export function resolveSideBet(
  id: SideBetId,
  r: HandResolution,
  cfg: SideBetConfig = defaultSideBetConfig,
): SideBetResult {
  switch (id) {
    case 'playerPair':
      return resolvePlayerPair(r);
    case 'bankerPair':
      return resolveBankerPair(r);
    case 'eitherPair':
      return resolveEitherPair(r);
    case 'perfectPair':
      return resolvePerfectPair(r, cfg);
    case 'smallTiger':
      return resolveSmallTiger(r, cfg);
    case 'bigTiger':
      return resolveBigTiger(r);
    case 'tiger':
      return resolveSixSplit(r);
    case 'tigerPair':
      return resolveTigerPair(r);
    case 'tigerTie':
      return resolveTigerTie(r);
    case 'lucky6':
      return resolveSixSplit(r);
    case 'super6':
      return resolveSuper6(r, cfg);
    case 'lucky7':
      return resolveLucky7(r);
    case 'superLucky7':
      return resolveSuperLucky7(r);
  }
}

// ---- catalog metadata (for UI, tips, dealer-mode explanations) ---------------

export interface SideBetCatalogEntry {
  id: SideBetId;
  displayName: string;
  family: SideBetFamily;
  aliases: string[];
  winCondition: string;
  // Description of the payout schedule, default first.
  payoutDescription: string;
  // Displayed 8-deck house edge for the default config; null when not published.
  houseEdge: number | null;
  notes: string;
}

export const SIDE_BETS: SideBetCatalogEntry[] = [
  {
    id: 'playerPair',
    displayName: 'Player Pair',
    family: 'pair',
    aliases: [],
    winCondition: "Player's first two cards are a pair (~7.47%/hand).",
    payoutDescription: '11:1',
    houseEdge: 10.36,
    notes: 'Resolves on the first two cards only.',
  },
  {
    id: 'bankerPair',
    displayName: 'Banker Pair',
    family: 'pair',
    aliases: [],
    winCondition: "Banker's first two cards are a pair.",
    payoutDescription: '11:1',
    houseEdge: 10.36,
    notes: 'Resolves on the first two cards only.',
  },
  {
    id: 'eitherPair',
    displayName: 'Either Pair',
    family: 'pair',
    aliases: [],
    winCondition: 'Either hand pairs on the first two cards.',
    payoutDescription: '5:1',
    houseEdge: 13.71,
    notes: '6-deck edge is 14.54%.',
  },
  {
    id: 'perfectPair',
    displayName: 'Perfect Pair',
    family: 'pair',
    aliases: [],
    winCondition: 'Either hand pairs in rank AND suit (~3.35%).',
    payoutDescription: '25:1 (configurable 25/26/27/28:1)',
    houseEdge: 13.03,
    notes: '25/26/27/28:1 → 13.03/9.68/6.34/2.99%.',
  },
  {
    id: 'smallTiger',
    displayName: 'Small Tiger',
    family: 'tiger',
    aliases: [],
    winCondition: 'Banker wins with a two-card total of 6.',
    payoutDescription: '22:1 (configurable 20/22/23:1)',
    houseEdge: 14.33,
    notes: '20/22/23:1 → 21.78/14.33/10.61%.',
  },
  {
    id: 'bigTiger',
    displayName: 'Big Tiger',
    family: 'tiger',
    aliases: [],
    winCondition: 'Banker wins with a three-card total of 6.',
    payoutDescription: '50:1',
    houseEdge: 15.25,
    notes: '',
  },
  {
    id: 'tiger',
    displayName: 'Tiger',
    family: 'tiger',
    aliases: ['Lucky 6', 'Lucky Six'],
    winCondition: 'Banker wins with any total of 6.',
    payoutDescription: '12:1 (two-card) / 20:1 (three-card)',
    houseEdge: 16.68,
    notes: 'Mathematically identical to Lucky 6.',
  },
  {
    id: 'tigerPair',
    displayName: 'Tiger Pair',
    family: 'tiger',
    aliases: [],
    winCondition: 'Tiered across both hands (Single / Double / Twin).',
    payoutDescription: 'Single 4:1 / Double 20:1 / Twin 100:1',
    houseEdge: 16.12,
    notes: 'Single = one hand pairs; Double = both pair, different ranks; Twin = both the same pair.',
  },
  {
    id: 'tigerTie',
    displayName: 'Tiger Tie',
    family: 'tiger',
    aliases: [],
    winCondition: 'The hand ends in a 6-6 tie.',
    payoutDescription: '35:1',
    houseEdge: 30.74,
    notes: 'The worst bet on the felt.',
  },
  {
    id: 'lucky6',
    displayName: 'Lucky 6',
    family: 'six',
    aliases: ['Tiger', 'Lucky Six'],
    winCondition: 'Banker wins with a 6 (= Tiger).',
    payoutDescription: '12:1 (two-card) / 20:1 (three-card)',
    houseEdge: 16.68,
    notes: 'Same event and schedule as Tiger.',
  },
  {
    id: 'super6',
    displayName: 'Super 6',
    family: 'six',
    aliases: [],
    winCondition: 'Banker wins with a 6, flat payout.',
    payoutDescription: '12:1 flat (configurable 12-17:1; 16:1 strongly recommended)',
    houseEdge: 29.98,
    notes: '12-17:1 → 29.98/24.59/19.20/13.82/8.43/3.05%. Distinct from the Super 6 game format.',
  },
  {
    id: 'lucky7',
    displayName: 'Lucky 7',
    family: 'seven',
    aliases: [],
    winCondition: 'Player wins with a total of 7 (8.16%).',
    payoutDescription: '6:1 (two-card) / 15:1 (three-card)',
    houseEdge: 18.3,
    notes: 'Player-side bet.',
  },
  {
    id: 'superLucky7',
    displayName: 'Super Lucky 7',
    family: 'seven',
    aliases: ['Super 7'],
    winCondition: "Player wins with 7 vs Banker's 6 (1.90%).",
    payoutDescription: 'up to 100:1 (six-card version pays 100:1)',
    houseEdge: null,
    notes: 'Edge not published — no fabricated figure is displayed.',
  },
];

export function sideBetById(id: SideBetId): SideBetCatalogEntry {
  const entry = SIDE_BETS.find((b) => b.id === id);
  if (!entry) throw new Error(`Unknown side bet: ${id}`);
  return entry;
}
