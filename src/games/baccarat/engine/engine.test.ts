import { describe, it, expect } from 'vitest';
import { Card, Rank, Suit, cardValue } from './cards';
import {
  Dealer,
  HandResolution,
  bankerDrawsCaseA,
  bankerDrawsCaseB,
  handTotal,
  isNatural,
  resolveHand,
} from './rules';
import { createShoe } from './shoe';
import { mulberry32 } from './rng';
import { resolveSideBet, SideBetId } from './sidebets';
import { settleMainBet, settleSideBet } from './payouts';

// ---- helpers ----------------------------------------------------------------

function card(rank: Rank, suit: Suit = 'spades'): Card {
  return { rank, suit };
}

// A card whose baccarat value is v (0 -> '10', 1 -> 'A', 2-9 -> pip).
function val(v: number, suit: Suit = 'spades'): Card {
  const map: Record<number, Rank> = {
    0: '10',
    1: 'A',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
  };
  return { rank: map[v], suit };
}

function dealerFromCards(cards: Card[]): Dealer {
  let i = 0;
  return {
    draw(): Card {
      if (i >= cards.length) throw new Error('dealer ran out of scripted cards');
      return cards[i++];
    },
  };
}

function resolveScript(cards: Card[]): HandResolution {
  return resolveHand(dealerFromCards(cards));
}

// ---- basic value / total mechanics ------------------------------------------

describe('card values and totals', () => {
  it('maps ranks to baccarat values', () => {
    expect(cardValue(card('A'))).toBe(1);
    expect(cardValue(card('9'))).toBe(9);
    expect(cardValue(card('10'))).toBe(0);
    expect(cardValue(card('J'))).toBe(0);
    expect(cardValue(card('K'))).toBe(0);
  });

  it('totals modulo 10', () => {
    expect(handTotal([card('7'), card('8')])).toBe(5); // 15 -> 5
    expect(handTotal([card('K'), card('9')])).toBe(9);
    expect(handTotal([card('5'), card('5')])).toBe(0);
  });

  it('detects naturals', () => {
    expect(isNatural([card('9'), card('K')])).toBe(true);
    expect(isNatural([card('5'), card('3')])).toBe(true); // 8
    expect(isNatural([card('5'), card('2')])).toBe(false); // 7
  });
});

// ---- Banker drawing table (both cases) --------------------------------------

describe('Banker drawing rules', () => {
  it('Case A: Player stood, Banker draws 0-5 / stands 6-7', () => {
    for (let t = 0; t <= 5; t++) expect(bankerDrawsCaseA(t)).toBe(true);
    expect(bankerDrawsCaseA(6)).toBe(false);
    expect(bankerDrawsCaseA(7)).toBe(false);
  });

  it('Case B: matches the published Banker drawing table exactly', () => {
    // D = true (draw), S = false (stand). Columns = Player third-card value 0..9.
    const D = true;
    const S = false;
    const expected: Record<number, boolean[]> = {
      7: [S, S, S, S, S, S, S, S, S, S],
      6: [S, S, S, S, S, S, D, D, S, S],
      5: [S, S, S, S, D, D, D, D, S, S],
      4: [S, S, D, D, D, D, D, D, S, S],
      3: [D, D, D, D, D, D, D, D, S, D],
      2: [D, D, D, D, D, D, D, D, D, D],
      1: [D, D, D, D, D, D, D, D, D, D],
      0: [D, D, D, D, D, D, D, D, D, D],
    };
    for (let total = 0; total <= 7; total++) {
      for (let third = 0; third <= 9; third++) {
        expect(bankerDrawsCaseB(total, third)).toBe(expected[total][third]);
      }
    }
  });

  it('integration: Banker 3 vs Player third card 8 stands', () => {
    // Player 2,2 -> 4 draws; third = 8 -> player total 2. Banker 1,2 -> 3, third value 8 -> stand.
    const r = resolveScript([val(2), val(1, 'hearts'), val(2, 'hearts'), val(2, 'clubs'), val(8)]);
    expect(r.player.drewThird).toBe(true);
    expect(r.banker.drewThird).toBe(false); // table[3][8] = S
  });

  it('integration: naturals freeze both hands', () => {
    const r = resolveScript([val(9), val(2), card('K'), val(3)]); // player 9 natural
    expect(r.natural).toBe(true);
    expect(r.player.cards).toHaveLength(2);
    expect(r.banker.cards).toHaveLength(2);
    expect(r.winner).toBe('Player');
  });
});

// ---- side-bet win conditions ------------------------------------------------

function side(id: SideBetId, cards: Card[]) {
  return resolveSideBet(id, resolveScript(cards));
}

describe('pair side bets', () => {
  it('Player Pair pays 11:1 on a first-two-card pair', () => {
    // Player 4,4 (natural 8); Banker 2,3.
    const res = side('playerPair', [val(4), val(2), val(4, 'hearts'), val(3)]);
    expect(res.won).toBe(true);
    expect(res.payout).toBe(11);
    expect(side('bankerPair', [val(4), val(2), val(4, 'hearts'), val(3)]).won).toBe(false);
  });

  it('Banker Pair pays 11:1', () => {
    const res = side('bankerPair', [val(3), val(9), val(4), val(9, 'hearts')]);
    expect(res.won).toBe(true);
    expect(res.payout).toBe(11);
  });

  it('Either Pair pays 5:1 when either hand pairs', () => {
    const res = side('eitherPair', [val(4), val(2), val(4, 'hearts'), val(3)]);
    expect(res.won).toBe(true);
    expect(res.payout).toBe(5);
  });

  it('Perfect Pair requires rank AND suit, pays 25:1 by default', () => {
    // Player 4 of hearts twice (8-deck allows the same card).
    const perfect = side('perfectPair', [val(4, 'hearts'), val(2), val(4, 'hearts'), val(2, 'hearts')]);
    expect(perfect.won).toBe(true);
    expect(perfect.payout).toBe(25);
    // Same rank different suit is not a perfect pair.
    const notPerfect = resolveSideBet('perfectPair', resolveScript([val(4, 'hearts'), val(2), val(4, 'spades'), val(3)]));
    expect(notPerfect.won).toBe(false);
  });

  it('Perfect Pair honors configurable payout', () => {
    const r = resolveScript([val(4, 'hearts'), val(2), val(4, 'hearts'), val(2, 'hearts')]);
    expect(resolveSideBet('perfectPair', r, { perfectPairPay: 28, smallTigerPay: 22, super6Pay: 12 }).payout).toBe(28);
  });
});

describe('tiger / six side bets', () => {
  // Banker wins with a two-card 6: Player 2,2 -> 4 draws A (val1) -> 5; Banker 2,4 -> 6 stands (table[6][1]=S).
  const twoCardBankerSix: Card[] = [val(2), val(2, 'clubs'), val(2, 'hearts'), val(4, 'clubs'), val(1)];
  // Banker wins with a three-card 6: Player 2,2 ->4 draws A ->5; Banker A,A ->2 draws 4 -> 6.
  const threeCardBankerSix: Card[] = [val(2), val(1, 'clubs'), val(2, 'hearts'), val(1, 'diamonds'), val(1), val(4, 'clubs')];

  it('two-card Banker 6: Small Tiger + Tiger(12) win, Big Tiger loses', () => {
    const r = resolveScript(twoCardBankerSix);
    expect(r.winner).toBe('Banker');
    expect(r.banker.total).toBe(6);
    expect(r.banker.cards).toHaveLength(2);
    expect(resolveSideBet('smallTiger', r).payout).toBe(22);
    expect(resolveSideBet('bigTiger', r).won).toBe(false);
    expect(resolveSideBet('tiger', r).payout).toBe(12);
    expect(resolveSideBet('lucky6', r).payout).toBe(12);
    expect(resolveSideBet('super6', r).payout).toBe(12);
  });

  it('three-card Banker 6: Big Tiger(50) + Tiger(20) win, Small Tiger loses', () => {
    const r = resolveScript(threeCardBankerSix);
    expect(r.winner).toBe('Banker');
    expect(r.banker.total).toBe(6);
    expect(r.banker.cards).toHaveLength(3);
    expect(resolveSideBet('bigTiger', r).payout).toBe(50);
    expect(resolveSideBet('smallTiger', r).won).toBe(false);
    expect(resolveSideBet('tiger', r).payout).toBe(20);
    expect(resolveSideBet('lucky6', r).payout).toBe(20);
  });

  it('Tiger Pair tiers: Single / Double / Twin', () => {
    // Single: only player pairs.
    const single = side('tigerPair', [val(4), val(2), val(4, 'hearts'), val(3)]);
    expect(single.payout).toBe(4);
    // Double: both pair, different ranks (4,4 vs 9,9).
    const double = side('tigerPair', [val(4), val(9), val(4, 'hearts'), val(9, 'hearts')]);
    expect(double.payout).toBe(20);
    // Twin: both the same pair (4,4 vs 4,4).
    const twin = side('tigerPair', [val(4), val(4, 'clubs'), val(4, 'hearts'), val(4, 'diamonds')]);
    expect(twin.payout).toBe(100);
  });

  it('Tiger Tie pays 35:1 on a 6-6 tie only', () => {
    const tie = side('tigerTie', [val(2), val(2, 'hearts'), val(4), val(4, 'hearts')]); // 6-6 tie
    expect(tie.payout).toBe(35);
    const notTie = side('tigerTie', [val(3), val(3, 'hearts'), val(4), val(4, 'hearts')]); // 7-7 tie
    expect(notTie.won).toBe(false);
  });
});

describe('seven side bets', () => {
  it('Lucky 7 pays 6:1 (two-card) and 15:1 (three-card)', () => {
    // Two-card Player 7: Player 3,4 -> 7 stands; Banker 2,4 -> 6 stands (Case A).
    const two = side('lucky7', [val(3), val(2, 'hearts'), val(4), val(4, 'hearts')]);
    expect(two.payout).toBe(6);
    // Three-card Player 7: Player 2,2 ->4 draws 3 -> 7; Banker 2,3 ->5, third val3 -> stand.
    const three = side('lucky7', [val(2), val(2, 'clubs'), val(2, 'hearts'), val(3, 'clubs'), val(3)]);
    expect(three.payout).toBe(15);
  });

  it('Super Lucky 7 wins on Player 7 vs Banker 6', () => {
    const res = side('superLucky7', [val(3), val(2, 'hearts'), val(4), val(4, 'hearts')]); // P7 vs B6
    expect(res.won).toBe(true);
    expect(res.payout).toBe(100);
    // Player 7 vs Banker 5 (Banker draws a 10 in Case A, stays at 5) does NOT win.
    const miss = side('superLucky7', [val(3), val(2, 'hearts'), val(4), val(3, 'hearts'), val(0, 'clubs')]);
    expect(miss.won).toBe(false);
  });
});

// ---- settlement -------------------------------------------------------------

describe('settlement', () => {
  const bankerWinTwoCardSix = [val(2), val(2, 'clubs'), val(2, 'hearts'), val(4, 'clubs'), val(1)];

  it('Banker win pays 0.95:1 under commission', () => {
    const r = resolveScript(bankerWinTwoCardSix);
    const s = settleMainBet('Banker', 100, r, 'commission');
    expect(s.net).toBeCloseTo(95, 6);
    expect(s.commission).toBeCloseTo(5, 6);
  });

  it('No-commission: Banker 6 pays 1:2', () => {
    const r = resolveScript(bankerWinTwoCardSix);
    const s = settleMainBet('Banker', 100, r, 'noCommission');
    expect(s.net).toBeCloseTo(50, 6);
  });

  it('Tie pushes Player/Banker and pays 8:1 to the Tie bet', () => {
    const r = resolveScript([val(2), val(2, 'hearts'), val(4), val(4, 'hearts')]); // 6-6 tie
    expect(settleMainBet('Player', 100, r, 'commission').push).toBe(true);
    expect(settleMainBet('Banker', 100, r, 'commission').push).toBe(true);
    expect(settleMainBet('Tie', 100, r, 'commission').net).toBe(800);
  });

  it('side-bet settlement returns net profit/loss', () => {
    const r = resolveScript(bankerWinTwoCardSix);
    expect(settleSideBet('smallTiger', 10, r).net).toBe(220);
    expect(settleSideBet('bigTiger', 10, r).net).toBe(-10);
  });
});

// ---- probability convergence ------------------------------------------------

describe('probability convergence (8-deck, seeded simulation)', () => {
  it('converges to published figures', () => {
    const HANDS = 2_000_000;
    const shoe = createShoe(mulberry32(0xc0ffee));

    let banker = 0,
      player = 0,
      tie = 0;
    let bankerSix = 0,
      playerSeven = 0;
    let pairHands = 0,
      perfectEither = 0,
      p7vsB6 = 0;

    for (let i = 0; i < HANDS; i++) {
      if (shoe.cutCardReached()) {
        // finish hand, one more, reshuffle handled lazily by draw(); for the sim we
        // simply let the shoe auto-reshuffle when exhausted. Nothing to do here.
      }
      const r = resolveHand(shoe);
      if (r.winner === 'Banker') banker++;
      else if (r.winner === 'Player') player++;
      else tie++;

      if (r.winner === 'Banker' && r.banker.total === 6) bankerSix++;
      if (r.winner === 'Player' && r.player.total === 7) playerSeven++;
      if (r.winner === 'Player' && r.player.total === 7 && r.banker.total === 6) p7vsB6++;

      if (r.player.pair.isPair) pairHands++;
      if (r.banker.pair.isPair) pairHands++;
      if (r.player.pair.isPerfect || r.banker.pair.isPerfect) perfectEither++;
    }

    const pct = (n: number) => (100 * n) / HANDS;
    const pctPerHand = (n: number) => (100 * n) / (2 * HANDS);

    expect(pct(banker)).toBeCloseTo(45.86, 0); // within ~0.5
    expect(pct(player)).toBeCloseTo(44.62, 0);
    expect(pct(tie)).toBeCloseTo(9.52, 0);

    // tighter manual tolerances
    expect(Math.abs(pct(banker) - 45.86)).toBeLessThan(0.3);
    expect(Math.abs(pct(player) - 44.62)).toBeLessThan(0.3);
    expect(Math.abs(pct(tie) - 9.52)).toBeLessThan(0.3);
    expect(Math.abs(pct(bankerSix) - 5.39)).toBeLessThan(0.25);
    expect(Math.abs(pct(playerSeven) - 8.16)).toBeLessThan(0.25);
    expect(Math.abs(pctPerHand(pairHands) - 7.47)).toBeLessThan(0.25);
    expect(Math.abs(pct(perfectEither) - 3.35)).toBeLessThan(0.2);
    expect(Math.abs(pct(p7vsB6) - 1.9)).toBeLessThan(0.2);
  }, 60_000);
});
