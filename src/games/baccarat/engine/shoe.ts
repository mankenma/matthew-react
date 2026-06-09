// 8-deck shoe with realistic burn and cut-card behavior.

import { type Card, RANKS, SUITS, cardValue } from './cards';
import { type RNG, systemRng } from './rng';

export const DECKS = 8;
export const CARDS_PER_DECK = 52;
export const CUT_CARD_FROM_BOTTOM = 16;

export interface Shoe {
  draw(): Card;
  // Cards remaining before the physical bottom of the shoe.
  remaining(): number;
  // True once the cut card has surfaced (i.e. we've drawn into the last 16).
  cutCardReached(): boolean;
  // Burn info from the most recent shuffle, for UI/teaching.
  lastBurn(): { indicator: Card; burned: Card[] } | null;
}

export function buildEightDecks(): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
  }
  return cards;
}

// In-place Fisher-Yates using the supplied RNG.
export function shuffle(cards: Card[], rng: RNG): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = cards[i];
    cards[i] = cards[j];
    cards[j] = tmp;
  }
}

export function createShoe(rng: RNG = systemRng): Shoe {
  let cards: Card[] = [];
  let idx = 0; // index of next card to draw
  let burn: { indicator: Card; burned: Card[] } | null = null;

  function freshShuffle(): void {
    cards = buildEightDecks();
    shuffle(cards, rng);
    idx = 0;
    // New shoe ceremony: turn over one card; burn that many (10/face = 10).
    const indicator = cards[idx++];
    let burnCount = cardValue(indicator);
    if (burnCount === 0) burnCount = 10; // 10/J/Q/K burn 10
    const burned: Card[] = [];
    for (let i = 0; i < burnCount && idx < cards.length; i++) {
      burned.push(cards[idx++]);
    }
    burn = { indicator, burned };
  }

  freshShuffle();

  // Position of the cut card: 16 cards from the bottom.
  const cutCardIndex = () => cards.length - CUT_CARD_FROM_BOTTOM;

  return {
    draw(): Card {
      if (idx >= cards.length) {
        // Safety: ran the shoe dry; reshuffle. Normal play reshuffles via cut card first.
        freshShuffle();
      }
      return cards[idx++];
    },
    remaining(): number {
      return cards.length - idx;
    },
    cutCardReached(): boolean {
      return idx >= cutCardIndex();
    },
    lastBurn() {
      return burn;
    },
  };
}
