// Core punto banco rules: totals, naturals, draw rules, Banker drawing table, resolveHand.

import { type Card, type Rank, type Suit, cardValue } from './cards';

export type Winner = 'Player' | 'Banker' | 'Tie';

export interface PairInfo {
  isPair: boolean;
  rank: Rank | null;
  // For perfect-pair detection: true when the two cards share rank AND suit.
  isPerfect: boolean;
  suit: Suit | null;
}

export interface HandResult {
  cards: Card[]; // 2 or 3 cards
  total: number; // final total 0-9
  drewThird: boolean;
  pair: PairInfo; // computed on the first two cards only
}

export interface HandResolution {
  player: HandResult;
  banker: HandResult;
  winner: Winner;
  // True when the outcome was decided by a two-card natural (8 or 9).
  natural: boolean;
}

// Sum of card values mod 10.
export function handTotal(cards: Card[]): number {
  let sum = 0;
  for (const c of cards) sum += cardValue(c);
  return sum % 10;
}

export function isNatural(twoCards: Card[]): boolean {
  const t = handTotal(twoCards);
  return t === 8 || t === 9;
}

export function pairInfo(c1: Card, c2: Card): PairInfo {
  const isPair = c1.rank === c2.rank;
  return {
    isPair,
    rank: isPair ? c1.rank : null,
    isPerfect: isPair && c1.suit === c2.suit,
    suit: isPair ? c1.suit : null,
  };
}

// Player draws on 0-5, stands on 6-7 (only consulted when no natural).
export function playerDraws(playerTwoCardTotal: number): boolean {
  return playerTwoCardTotal <= 5;
}

const D = true;
const S = false;

// Banker drawing table (Case B — Player drew a third card).
// Indexed [bankerTwoCardTotal][playerThirdCardValue]. Rows 0..7; columns 0..9.
// Banker totals 8-9 are naturals and never reach this table.
export const BANKER_DRAW_TABLE: boolean[][] = [
  /* 0 */ [D, D, D, D, D, D, D, D, D, D],
  /* 1 */ [D, D, D, D, D, D, D, D, D, D],
  /* 2 */ [D, D, D, D, D, D, D, D, D, D],
  /* 3 */ [D, D, D, D, D, D, D, D, S, D],
  /* 4 */ [S, S, D, D, D, D, D, D, S, S],
  /* 5 */ [S, S, S, S, D, D, D, D, S, S],
  /* 6 */ [S, S, S, S, S, S, D, D, S, S],
  /* 7 */ [S, S, S, S, S, S, S, S, S, S],
];

// Case A — Player stood (total 6 or 7): Banker draws on 0-5, stands on 6-7.
export function bankerDrawsCaseA(bankerTwoCardTotal: number): boolean {
  return bankerTwoCardTotal <= 5;
}

// Case B — Player drew a third card: consult the table.
export function bankerDrawsCaseB(bankerTwoCardTotal: number, playerThirdCardValue: number): boolean {
  if (bankerTwoCardTotal >= 8) return false; // naturals never reach here
  return BANKER_DRAW_TABLE[bankerTwoCardTotal][playerThirdCardValue];
}

export interface Dealer {
  draw(): Card;
}

// Fully resolve one coup from a dealing source.
export function resolveHand(dealer: Dealer): HandResolution {
  const p1 = dealer.draw();
  const b1 = dealer.draw();
  const p2 = dealer.draw();
  const b2 = dealer.draw();

  const playerCards: Card[] = [p1, p2];
  const bankerCards: Card[] = [b1, b2];

  const pPair = pairInfo(p1, p2);
  const bPair = pairInfo(b1, b2);

  const playerTwo = handTotal(playerCards);
  const bankerTwo = handTotal(bankerCards);

  const natural = isNatural(playerCards) || isNatural(bankerCards);

  let playerDrew = false;
  let bankerDrew = false;
  let playerThirdValue: number | null = null;

  if (!natural) {
    // Player decision first.
    if (playerDraws(playerTwo)) {
      const p3 = dealer.draw();
      playerCards.push(p3);
      playerDrew = true;
      playerThirdValue = cardValue(p3);
    }

    // Banker decision.
    if (!playerDrew) {
      // Case A
      if (bankerDrawsCaseA(bankerTwo)) {
        bankerCards.push(dealer.draw());
        bankerDrew = true;
      }
    } else {
      // Case B
      if (bankerDrawsCaseB(bankerTwo, playerThirdValue!)) {
        bankerCards.push(dealer.draw());
        bankerDrew = true;
      }
    }
  }

  const playerFinal = handTotal(playerCards);
  const bankerFinal = handTotal(bankerCards);

  let winner: Winner;
  if (playerFinal > bankerFinal) winner = 'Player';
  else if (bankerFinal > playerFinal) winner = 'Banker';
  else winner = 'Tie';

  return {
    player: {
      cards: playerCards,
      total: playerFinal,
      drewThird: playerDrew,
      pair: pPair,
    },
    banker: {
      cards: bankerCards,
      total: bankerFinal,
      drewThird: bankerDrew,
      pair: bPair,
    },
    winner,
    natural,
  };
}
