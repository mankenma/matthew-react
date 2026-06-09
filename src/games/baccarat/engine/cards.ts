// Pure card model — no React, no DOM.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

// Rank label as it appears on a card face.
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const RED_SUITS: ReadonlySet<Suit> = new Set<Suit>(['hearts', 'diamonds']);

export function isRed(suit: Suit): boolean {
  return RED_SUITS.has(suit);
}

// Baccarat card value: Ace = 1, 2-9 = pip, 10/J/Q/K = 0.
export function cardValue(card: Card): number {
  switch (card.rank) {
    case 'A':
      return 1;
    case '10':
    case 'J':
    case 'Q':
    case 'K':
      return 0;
    default:
      return Number(card.rank);
  }
}

export function cardLabel(card: Card): string {
  const suitGlyph: Record<Suit, string> = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
  };
  return `${card.rank}${suitGlyph[card.suit]}`;
}
