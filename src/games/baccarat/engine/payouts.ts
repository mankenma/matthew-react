// Settlement: base-game payouts (commission / no-commission) + side-bet payouts.

import type { HandResolution, Winner } from './rules';
import { type SideBetConfig, type SideBetId, defaultSideBetConfig, resolveSideBet } from './sidebets';

export type BaseFormat = 'commission' | 'noCommission';

export type MainBet = 'Player' | 'Banker' | 'Tie';

export interface BaseBetSettlement {
  bet: MainBet;
  stake: number;
  // Net change to bankroll: positive profit, negative loss, 0 push.
  net: number;
  push: boolean;
  commission: number; // commission paid on a Banker win (commission format)
}

// Settle one main bet given the resolved hand and base format.
export function settleMainBet(
  bet: MainBet,
  stake: number,
  resolution: HandResolution,
  format: BaseFormat,
): BaseBetSettlement {
  const winner: Winner = resolution.winner;

  // Tie pushes Player and Banker bets.
  if (winner === 'Tie' && (bet === 'Player' || bet === 'Banker')) {
    return { bet, stake, net: 0, push: true, commission: 0 };
  }

  if (bet === 'Tie') {
    if (winner === 'Tie') return { bet, stake, net: stake * 8, push: false, commission: 0 };
    return { bet, stake, net: -stake, push: false, commission: 0 };
  }

  if (bet === 'Player') {
    if (winner === 'Player') return { bet, stake, net: stake, push: false, commission: 0 };
    return { bet, stake, net: -stake, push: false, commission: 0 };
  }

  // bet === 'Banker'
  if (winner === 'Banker') {
    if (format === 'commission') {
      const commission = stake * 0.05;
      return { bet, stake, net: stake - commission, push: false, commission };
    }
    // No-Commission ("Super 6"): even money except a winning Banker 6 pays 1:2.
    if (resolution.banker.total === 6) {
      return { bet, stake, net: stake * 0.5, push: false, commission: 0 };
    }
    return { bet, stake, net: stake, push: false, commission: 0 };
  }
  return { bet, stake, net: -stake, push: false, commission: 0 };
}

export interface SideBetSettlement {
  id: SideBetId;
  stake: number;
  won: boolean;
  payout: number; // multiple to 1
  net: number; // payout*stake on a win, -stake on a loss
  detail: string;
}

export function settleSideBet(
  id: SideBetId,
  stake: number,
  resolution: HandResolution,
  cfg: SideBetConfig = defaultSideBetConfig,
): SideBetSettlement {
  const res = resolveSideBet(id, resolution, cfg);
  const net = res.won ? res.payout * stake : -stake;
  return { id, stake, won: res.won, payout: res.payout, net, detail: res.detail };
}

export interface RoundBets {
  main?: { bet: MainBet; stake: number };
  side: { id: SideBetId; stake: number }[];
}

export interface RoundSettlement {
  main: BaseBetSettlement | null;
  side: SideBetSettlement[];
  totalNet: number;
  totalCommission: number;
}

export function settleRound(
  bets: RoundBets,
  resolution: HandResolution,
  format: BaseFormat,
  cfg: SideBetConfig = defaultSideBetConfig,
): RoundSettlement {
  const main = bets.main
    ? settleMainBet(bets.main.bet, bets.main.stake, resolution, format)
    : null;
  const side = bets.side.map((b) => settleSideBet(b.id, b.stake, resolution, cfg));

  let totalNet = main ? main.net : 0;
  let totalCommission = main ? main.commission : 0;
  for (const s of side) totalNet += s.net;

  return { main, side, totalNet, totalCommission };
}
