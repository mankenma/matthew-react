import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useConfig } from '../../store/config';
import { usePersistentState } from '../../store/persist';
import { useDealer } from '../../store/useDealer';
import type { HandResolution } from '../../engine/rules';
import { type Card, cardValue } from '../../engine/cards';
import { type MainBet, type RoundSettlement, settleRound } from '../../engine/payouts';
import { SIDE_BETS, type SideBetId, sideBetById, resolveSideBet } from '../../engine/sidebets';
import type { RoadEntry } from '../../engine/roads';
import { Hand } from '../../components/table/Hand';
import { Chip } from '../../components/chips/Chip';
import { Scoreboard } from '../../components/scoreboard/Scoreboard';
import { useCountUp } from '../../hooks/useCountUp';

const CHIPS = [1, 5, 25, 100, 500];

interface PlayerStats {
  handsPlayed: number;
  net: number;
  totalCommission: number;
  mainPlaced: Record<MainBet, number>;
  mainWins: Record<MainBet, number>;
  sideNet: Partial<Record<SideBetId, number>>;
}

const ZERO_STATS: PlayerStats = {
  handsPlayed: 0,
  net: 0,
  totalCommission: 0,
  mainPlaced: { Player: 0, Banker: 0, Tie: 0 },
  mainWins: { Player: 0, Banker: 0, Tie: 0 },
  sideNet: {},
};

type Phase = 'betting' | 'revealing' | 'squeeze' | 'settled';

// A full record of every hand dealt this run (real and free), kept so the run
// can be exported to CSV with the actual cards. Parallel to the road entries.
interface RoundLog {
  winner: 'Player' | 'Banker' | 'Tie';
  playerCards: Card[];
  bankerCards: Card[];
  sideHit: boolean;
}

export function PlayerMode() {
  const { config } = useConfig();
  const { deal, status } = useDealer();

  const [bankroll, setBankroll, resetBankroll] = usePersistentState<number>('bt:bankroll', config.startingBankroll);
  const [stats, setStats, resetStats] = usePersistentState<PlayerStats>('bt:playerStats', ZERO_STATS);

  const [chip, setChip] = useState(25);
  const [mainStake, setMainStake] = useState<Record<MainBet, number>>({ Player: 0, Banker: 0, Tie: 0 });
  const [sideStake, setSideStake] = useState<Partial<Record<SideBetId, number>>>({});
  const [phase, setPhase] = useState<Phase>('betting');
  const [resolution, setResolution] = useState<HandResolution | null>(null);
  const [settlement, setSettlement] = useState<RoundSettlement | null>(null);
  const [revealIdx, setRevealIdx] = useState(0);
  const [road, setRoad] = useState<RoadEntry[]>([]);
  const [log, setLog] = useState<RoundLog[]>([]);
  const [tip, setTip] = useState<string | null>(null);
  const [freeNote, setFreeNote] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  const settled = useRef(false);
  const lastBets = useRef<{ main: Record<MainBet, number>; side: Partial<Record<SideBetId, number>> } | null>(null);

  const enabledSide = useMemo(() => SIDE_BETS.filter((b) => config.enabledSideBets.includes(b.id)), [config.enabledSideBets]);

  // Canonical squeeze order: P1, B1, P2, B2, then any third cards (player first).
  const revealOrder = useMemo<('player' | 'banker')[]>(() => {
    if (!resolution) return [];
    const order: ('player' | 'banker')[] = ['player', 'banker', 'player', 'banker'];
    if (resolution.player.cards.length > 2) order.push('player');
    if (resolution.banker.cards.length > 2) order.push('banker');
    return order;
  }, [resolution]);

  const revealedPlayer = revealOrder.slice(0, revealIdx).filter((h) => h === 'player').length;
  const revealedBanker = revealIdx - revealedPlayer;
  const nextHand_ = revealOrder[revealIdx] as 'player' | 'banker' | undefined;

  // How many cards are physically on the table. The first two of each hand are
  // dealt up front; a third card is only dealt once the squeeze reaches its turn,
  // mirroring a real table where nobody draws until the first four are known.
  let dealtPlayer = Math.min(2, resolution?.player.cards.length ?? 0);
  let dealtBanker = Math.min(2, resolution?.banker.cards.length ?? 0);
  revealOrder.forEach((h, pos) => {
    if (pos >= 4 && revealIdx >= pos) {
      if (h === 'player') dealtPlayer = 3;
      else dealtBanker = 3;
    }
  });

  const totalStaked = mainStake.Player + mainStake.Banker + mainStake.Tie + Object.values(sideStake).reduce((a, b) => a + (b || 0), 0);

  // A free hand leaves its resolved cards on the table while still in the betting
  // phase. Detect that so the table can show totals + the winner highlight.
  const showingFree = phase === 'betting' && resolution != null;

  // Count-up choreography: the bankroll ticks whenever it changes, and the
  // settled net animates up from 0 as the hero beat of the round.
  const bankrollDisplay = useCountUp(bankroll, 700);
  const netDisplay = useCountUp(phase === 'settled' && settlement ? settlement.totalNet : 0, 600, phase === 'settled');

  const canAfford = (amount: number) => totalStaked + amount <= bankroll;

  // Wipe a lingering free-hand result so a real bet starts from a clean table.
  function clearFree() {
    setResolution(null);
    setSettlement(null);
    setFreeNote(null);
  }

  function addMain(bet: MainBet) {
    if (phase !== 'betting' || !canAfford(chip)) return;
    if (showingFree) clearFree();
    setMainStake((s) => ({ ...s, [bet]: s[bet] + chip }));
  }
  function addSide(id: SideBetId) {
    if (phase !== 'betting' || !canAfford(chip)) return;
    if (showingFree) clearFree();
    setSideStake((s) => ({ ...s, [id]: (s[id] || 0) + chip }));
  }
  function clearBets() {
    if (phase !== 'betting') return;
    setMainStake({ Player: 0, Banker: 0, Tie: 0 });
    setSideStake({});
    clearFree();
  }
  function rebet() {
    if (phase !== 'betting' || !lastBets.current) return;
    const lb = lastBets.current;
    const total = lb.main.Player + lb.main.Banker + lb.main.Tie + Object.values(lb.side).reduce((a, b) => a + (b || 0), 0);
    if (total > bankroll) return;
    setMainStake({ ...lb.main });
    setSideStake({ ...lb.side });
  }

  function buildTip(res: HandResolution, settle: RoundSettlement): string | null {
    if (!config.showTips) return null;
    if (stats.handsPlayed > 0 && stats.handsPlayed % 1 === 0 && Math.random() > 0.4) return null; // ~40% of hands
    const candidates: string[] = [];
    const placedSide = new Set(settle.side.map((s) => s.id));
    if (placedSide.has('tigerTie')) candidates.push('Tiger Tie is the worst bet on the felt at ~30.7% house edge — it needs an exact 6-6 tie.');
    if (placedSide.has('super6')) candidates.push('Lucky 6 (16.68%) would have been roughly half the edge of a flat Super 6 for the very same Banker-6 event.');
    if (mainStake.Tie > 0) candidates.push('The Tie bet pays 8:1 but carries a ~14.4% edge. Banker is the disciplined call.');
    if (mainStake.Banker > 0 && res.winner === 'Banker' && res.banker.total === 6 && config.baseFormat === 'noCommission') {
      candidates.push('In No-Commission, a winning Banker 6 only pays 1:2 — that half-win is where the house earns its keep.');
    }
    if (placedSide.size > 0) candidates.push('Most side bets carry 10–30% edges. Over time, the felt’s cost shows up in your per-bet net below.');
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Which enabled side bets would have won on this resolution.
  function sideBetHits(res: HandResolution): string[] {
    return enabledSide.filter((b) => resolveSideBet(b.id, res, config.sideBets).won).map((b) => b.displayName);
  }

  // Append a hand (real or free) to the exportable run log, parallel to the road.
  function logRound(res: HandResolution) {
    setLog((l) => [
      ...l,
      {
        winner: res.winner,
        playerCards: res.player.cards,
        bankerCards: res.banker.cards,
        sideHit: sideBetHits(res).length > 0,
      },
    ]);
  }

  // A no-stakes hand: deal, report which side bets would have hit, and grow the
  // trend board. No bankroll or win-rate impact since nothing was wagered.
  function freeHand() {
    if (phase !== 'betting' || totalStaked > 0) return;
    const res = deal();
    // Show the resolved hand in the usual card spots (no wager attached).
    setResolution(res);
    setSettlement(null);
    setRoad((r) => [
      ...r,
      {
        winner: res.winner,
        playerPair: res.player.pair.isPair,
        bankerPair: res.banker.pair.isPair,
        playerTotal: res.player.total,
        bankerTotal: res.banker.total,
      },
    ]);
    logRound(res);
    const winLabel = res.winner === 'Tie' ? 'Tie' : `${res.winner} wins`;
    const hits = sideBetHits(res);
    setFreeNote(`Player ${res.player.total} · Banker ${res.banker.total} — ${winLabel}. ${hits.length ? `Would have hit: ${hits.join(', ')}` : 'No side bets hit'}.`);
  }

  function onDeal() {
    if (phase !== 'betting' || totalStaked === 0) return;
    setFreeNote(null);
    const res = deal();
    const bets = {
      main: pickMain(mainStake),
      side: Object.entries(sideStake)
        .filter(([, v]) => (v || 0) > 0)
        .map(([id, v]) => ({ id: id as SideBetId, stake: v as number })),
    };
    const settle = settleRound(bets, res, config.baseFormat, config.sideBets);

    lastBets.current = { main: { ...mainStake }, side: { ...sideStake } };
    settled.current = false;
    setResolution(res);
    setSettlement(settle);
    setRevealIdx(0);

    if (config.squeeze) {
      setPhase('squeeze');
    } else {
      setPhase('revealing');
      setTimeout(() => finishRound(res, settle), 1400);
    }
  }

  function finishRound(res: HandResolution, settle: RoundSettlement) {
    if (settled.current) return;
    settled.current = true;
    setBankroll((b) => b + settle.totalNet);
    setStats((st) => applyStats(st, mainStake, settle));
    setRoad((r) => [
      ...r,
      {
        winner: res.winner,
        playerPair: res.player.pair.isPair,
        bankerPair: res.banker.pair.isPair,
        playerTotal: res.player.total,
        bankerTotal: res.banker.total,
      },
    ]);
    logRound(res);
    setTip(buildTip(res, settle));
    setPhase('settled');
  }

  function squeezeNext() {
    if (phase !== 'squeeze') return;
    setRevealIdx((i) => Math.min(i + 1, revealOrder.length));
  }

  function revealAll() {
    if (phase !== 'squeeze') return;
    setRevealIdx(revealOrder.length);
  }

  // Once every card is squeezed open, let the last flip land, then settle.
  useEffect(() => {
    if (phase !== 'squeeze' || revealOrder.length === 0) return;
    if (revealIdx < revealOrder.length) return;
    const t = setTimeout(() => {
      if (resolution && settlement) finishRound(resolution, settlement);
    }, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealIdx, revealOrder.length]);

  function nextHand() {
    setPhase('betting');
    setResolution(null);
    setSettlement(null);
    setRevealIdx(0);
    setMainStake({ Player: 0, Banker: 0, Tie: 0 });
    setSideStake({});
    setTip(null);
    setFreeNote(null);
  }

  // Export every hand dealt this run to a CSV file. One row per round, with the
  // actual cards (rank + suit). Third cards are 'N/A' when the hand stood pat.
  function exportCSV() {
    if (log.length === 0) return;
    const header = [
      'Round',
      'Winner (Player/Banker/Tie)',
      'Player Card 1',
      'Player Card 2',
      'Player Card 3',
      'Bank Card 1',
      'Bank Card 2',
      'Banker Card 3',
      'Side bets hit?',
    ];
    const SUIT_LETTER: Record<Card['suit'], string> = { hearts: 'h', diamonds: 'd', clubs: 'c', spades: 's' };
    const cell = (c?: Card) => (c ? `${c.rank}${SUIT_LETTER[c.suit]}` : 'N/A');
    const rows = log.map((e, i) => [
      String(i + 1),
      e.winner,
      cell(e.playerCards[0]),
      cell(e.playerCards[1]),
      cell(e.playerCards[2]),
      cell(e.bankerCards[0]),
      cell(e.bankerCards[1]),
      cell(e.bankerCards[2]),
      e.sideHit ? '1' : '0',
    ]);
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baccarat-run-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  // Keyboard: Enter deals (or plays a free hand when nothing is staked),
  // advances the squeeze, or moves to the next hand once settled.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (phase === 'betting') {
        if (totalStaked > 0) onDeal();
        else freeHand();
      } else if (phase === 'settled') {
        nextHand();
      } else if (phase === 'squeeze') {
        squeezeNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, totalStaked]);

  const resultLabel =
    settlement && resolution
      ? resolution.winner === 'Tie'
        ? 'Tie'
        : `${resolution.winner} wins`
      : '';

  // Which main spot got paid (for the flying payout chip on settle).
  const mainWinBet = phase === 'settled' && settlement?.main && settlement.main.net > 0 ? settlement.main.bet : null;
  const mainWinAmount = settlement?.main?.net ?? 0;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
      {/* TABLE */}
      <div className="felt-surface relative overflow-hidden rounded-3xl border border-brass/20 p-5">
        {/* Decorative table furniture — printed layout arc, sits behind the play. */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="table-arc" />
        </div>

        <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-xs uppercase tracking-widest text-white/55">Bankroll</span>
            <span className="tnum font-display text-2xl font-bold brass-text">${Math.round(bankrollDisplay).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/55">
            <svg width="13" height="17" viewBox="0 0 13 17" aria-hidden className="text-brass/70">
              <rect x="0.75" y="0.75" width="11.5" height="15.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3.5 8.5h6M6.5 5.5v6" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            </svg>
            Shoe: <span className="tnum">{status.remaining}</span> cards
            {status.cutReached && <span className="ml-2 text-brass">cut card — reshuffle soon</span>}
          </div>
        </div>

        {/* hands */}
        <div className="mb-5 flex items-start justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <Hand
              label="Player"
              cards={phase === 'squeeze' ? (resolution?.player.cards ?? []).slice(0, dealtPlayer) : resolution?.player.cards ?? []}
              total={
                phase === 'betting'
                  ? showingFree
                    ? resolution?.player.total ?? null
                    : null
                  : phase === 'squeeze'
                    ? runningTotal(resolution?.player.cards ?? [], revealedPlayer)
                    : resolution?.player.total ?? null
              }
              isPair={phase !== 'squeeze' || revealedPlayer >= (resolution?.player.cards.length ?? 0) ? resolution?.player.pair.isPair : false}
              isWinner={(phase === 'settled' || showingFree) && resolution?.winner === 'Player'}
              glow={(phase === 'settled' || showingFree) && resolution?.winner === 'Player'}
              revealCount={phase === 'squeeze' ? revealedPlayer : undefined}
              squeezeIndex={phase === 'squeeze' && nextHand_ === 'player' ? revealedPlayer : undefined}
              onSqueeze={squeezeNext}
              dealStagger={phase === 'squeeze' ? 220 : 120}
              flipMs={620}
            />
            {mainStake.Player > 0 && <Chip value={mainStake.Player} size={32} animate />}
          </div>
          <div className="self-center font-display text-2xl text-white/20">vs</div>
          <div className="flex flex-col items-center gap-2">
            <Hand
              label="Banker"
              cards={phase === 'squeeze' ? (resolution?.banker.cards ?? []).slice(0, dealtBanker) : resolution?.banker.cards ?? []}
              total={
                phase === 'betting'
                  ? showingFree
                    ? resolution?.banker.total ?? null
                    : null
                  : phase === 'squeeze'
                    ? runningTotal(resolution?.banker.cards ?? [], revealedBanker)
                    : resolution?.banker.total ?? null
              }
              isPair={phase !== 'squeeze' || revealedBanker >= (resolution?.banker.cards.length ?? 0) ? resolution?.banker.pair.isPair : false}
              isWinner={(phase === 'settled' || showingFree) && resolution?.winner === 'Banker'}
              glow={(phase === 'settled' || showingFree) && resolution?.winner === 'Banker'}
              revealCount={phase === 'squeeze' ? revealedBanker : undefined}
              squeezeIndex={phase === 'squeeze' && nextHand_ === 'banker' ? revealedBanker : undefined}
              onSqueeze={squeezeNext}
              dealStagger={phase === 'squeeze' ? 220 : 120}
              flipMs={620}
            />
            {mainStake.Banker > 0 && <Chip value={mainStake.Banker} size={32} animate />}
          </div>
        </div>

        {phase === 'settled' && (
          <div className="mb-4 flex flex-col items-center gap-1 animate-popIn">
            <span className="font-display text-3xl font-bold brass-text drop-shadow-[0_2px_8px_rgba(201,162,75,0.35)]">{resultLabel}</span>
            <span className={`tnum animate-countPop text-2xl font-bold ${settlement!.totalNet >= 0 ? 'text-tie-green' : 'text-banker-red'}`}>
              {netDisplay >= 0 ? '+' : '−'}
              {Math.abs(netDisplay).toFixed(2)}
            </span>
          </div>
        )}

        {/* main bet spots */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <BetSpot label="Player" subtitle="1:1" stake={mainStake.Player} accent="player" onClick={() => addMain('Player')} disabled={phase !== 'betting'} won={mainWinBet === 'Player'} winAmount={mainWinAmount} />
          <BetSpot label="Tie" subtitle="8:1" stake={mainStake.Tie} accent="tie" onClick={() => addMain('Tie')} disabled={phase !== 'betting'} won={mainWinBet === 'Tie'} winAmount={mainWinAmount} />
          <BetSpot
            label="Banker"
            subtitle={
              config.baseFormat === 'commission' ? (
                '0.95:1'
              ) : (
                <span className="flex flex-col items-center leading-tight">
                  <span>1:1</span>
                  <span>Banker 6 pays 1:2</span>
                </span>
              )
            }
            accent="banker"
            stake={mainStake.Banker}
            onClick={() => addMain('Banker')}
            disabled={phase !== 'betting'}
            won={mainWinBet === 'Banker'}
            winAmount={mainWinAmount}
          />
        </div>

        {/* side bets */}
        {enabledSide.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-widest text-white/50">Proposition bets</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {enabledSide.map((b) => (
                <SideSpot
                  key={b.id}
                  name={b.displayName}
                  pay={b.payoutDescription}
                  edge={b.houseEdge}
                  stake={sideStake[b.id] || 0}
                  result={phase === 'settled' ? settlement?.side.find((s) => s.id === b.id) : undefined}
                  onClick={() => addSide(b.id)}
                  disabled={phase !== 'betting'}
                />
              ))}
            </div>
          </div>
        )}

        {/* chip tray + actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-2">
            {CHIPS.map((v) => (
              <Chip key={v} value={v} selected={chip === v} onClick={() => setChip(v)} size={46} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {phase === 'betting' ? (
              <>
                <button onClick={rebet} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:border-white/30">Rebet</button>
                <button onClick={clearBets} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:border-white/30">Clear</button>
                {totalStaked === 0 ? (
                  <button
                    onClick={freeHand}
                    title="Deal a hand with no bet — press Enter"
                    className="rounded-lg border border-brass/40 px-4 py-2 text-sm text-brass/90 hover:border-brass hover:text-brass"
                  >
                    Free hand ⏎
                  </button>
                ) : (
                  <button
                    onClick={onDeal}
                    className="rounded-lg bg-brass px-6 py-2 text-sm font-bold text-charcoal"
                  >
                    Deal · ${totalStaked}
                  </button>
                )}
              </>
            ) : phase === 'settled' ? (
              <button onClick={nextHand} className="rounded-lg bg-brass px-6 py-2 text-sm font-bold text-charcoal">Next hand</button>
            ) : phase === 'squeeze' ? (
              <>
                <span className="text-sm text-brass animate-popIn">
                  {nextHand_ ? 'Drag the glowing card to peel it open…' : 'Revealing…'}
                </span>
                {nextHand_ && (
                  <button onClick={revealAll} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:border-white/30">
                    Reveal all
                  </button>
                )}
              </>
            ) : (
              <span className="text-sm text-white/60">Dealing…</span>
            )}
          </div>
        </div>

        {phase === 'betting' && freeNote && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-[12px] leading-relaxed text-white/65 animate-popIn">
            <span className="font-semibold text-white/60">Free hand · </span>
            {freeNote}
          </div>
        )}

        {tip && (
          <div className="mt-4 rounded-lg border border-brass/30 bg-black/30 p-3 text-[12px] leading-relaxed text-white/70 animate-popIn">
            <span className="brass-text font-semibold">Tip · </span>
            {tip}
          </div>
        )}
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/5 bg-charcoal-2/70 p-4 gold-edge">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white/70">Session</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                disabled={log.length === 0}
                title="Download every hand this run as CSV"
                className={`-m-2 p-2 text-[11px] disabled:cursor-default disabled:text-white/20 ${
                  exported ? 'text-tie-green' : 'text-brass/80 hover:text-brass'
                }`}
              >
                {exported ? 'exported ✓' : `export csv${log.length > 0 ? ` (${log.length})` : ''}`}
              </button>
              <button
                onClick={() => {
                  resetBankroll();
                  resetStats();
                  setRoad([]);
                  setLog([]);
                }}
                className="-m-2 p-2 text-[11px] text-white/55 hover:text-banker-red"
              >
                reset
              </button>
            </div>
          </div>
          <dl className="space-y-1.5 text-sm">
            <Stat label="Hands played" value={stats.handsPlayed.toString()} />
            <Stat label="Net result" value={`${stats.net >= 0 ? '+' : ''}${stats.net.toFixed(2)}`} positive={stats.net >= 0} />
            <Stat label="Commission paid" value={stats.totalCommission.toFixed(2)} muted />
            <div className="my-2 border-t border-white/5" />
            {(['Banker', 'Player', 'Tie'] as MainBet[]).map((b) => (
              <Stat
                key={b}
                label={`${b} win rate`}
                value={stats.mainPlaced[b] ? `${((100 * stats.mainWins[b]) / stats.mainPlaced[b]).toFixed(0)}% (${stats.mainWins[b]}/${stats.mainPlaced[b]})` : '—'}
                muted
              />
            ))}
          </dl>
          {Object.keys(stats.sideNet).length > 0 && (
            <>
              <div className="my-2 border-t border-white/5" />
              <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Net per side bet</div>
              <dl className="space-y-1 text-[13px]">
                {Object.entries(stats.sideNet).map(([id, net]) => (
                  <Stat key={id} label={sideBetById(id as SideBetId).displayName} value={`${(net as number) >= 0 ? '+' : ''}${(net as number).toFixed(0)}`} positive={(net as number) >= 0} />
                ))}
              </dl>
            </>
          )}
        </div>

        <Scoreboard entries={road} />
      </div>
    </div>
  );
}

// Running baccarat total of the first `n` revealed cards (sum mod 10).
function runningTotal(cards: Card[], n: number): number | null {
  if (n <= 0) return null;
  const sum = cards.slice(0, n).reduce((a, c) => a + cardValue(c), 0);
  return sum % 10;
}

function pickMain(mainStake: Record<MainBet, number>): { bet: MainBet; stake: number } | undefined {
  // The base game allows a single main wager; the largest staked spot is the active bet.
  const entries = (['Banker', 'Player', 'Tie'] as MainBet[]).filter((b) => mainStake[b] > 0);
  if (entries.length === 0) return undefined;
  let best = entries[0];
  for (const b of entries) if (mainStake[b] > mainStake[best]) best = b;
  // Sum all main stakes onto the chosen spot would misrepresent; instead settle each separately is overkill.
  // We settle only the dominant main bet but include the full staked amount on it.
  const stake = entries.reduce((a, b) => a + mainStake[b], 0);
  return { bet: best, stake };
}

function applyStats(st: PlayerStats, mainStake: Record<MainBet, number>, settle: RoundSettlement): PlayerStats {
  const next: PlayerStats = {
    handsPlayed: st.handsPlayed + 1,
    net: st.net + settle.totalNet,
    totalCommission: st.totalCommission + settle.totalCommission,
    mainPlaced: { ...st.mainPlaced },
    mainWins: { ...st.mainWins },
    sideNet: { ...st.sideNet },
  };
  if (settle.main) {
    next.mainPlaced[settle.main.bet] += 1;
    if (settle.main.net > 0) next.mainWins[settle.main.bet] += 1;
  }
  for (const s of settle.side) {
    next.sideNet[s.id] = (next.sideNet[s.id] || 0) + s.net;
  }
  void mainStake;
  return next;
}

function Stat({ label, value, positive, muted }: { label: string; value: string; positive?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/60">{label}</dt>
      <dd className={`tnum font-semibold ${muted ? 'text-white/55' : positive === undefined ? 'text-bone' : positive ? 'text-tie-green' : 'text-banker-red'}`}>{value}</dd>
    </div>
  );
}

function BetSpot({ label, subtitle, stake, accent, onClick, disabled, won, winAmount }: { label: string; subtitle: ReactNode; stake: number; accent: 'player' | 'banker' | 'tie'; onClick: () => void; disabled: boolean; won?: boolean; winAmount?: number }) {
  // The spot is painted onto the baize: `currentColor` drives the engraved oval
  // border (see `.baize-spot`), so set the seat accent as the text color.
  const text = accent === 'player' ? 'text-player-blue' : accent === 'banker' ? 'text-banker-red' : 'text-tie-green';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`baize-spot relative flex flex-col items-center justify-center rounded-[34px] py-5 ${text} transition-all hover:brightness-125 disabled:cursor-default ${
        won ? 'animate-winnerGlow' : ''
      }`}
    >
      <span className="font-display text-lg font-bold tracking-wide">{label}</span>
      <span className="tnum text-[11px] text-white/60">{subtitle}</span>
      {stake > 0 && (
        <span className="tnum mt-1 rounded-full bg-brass px-2 py-0.5 text-xs font-bold text-charcoal animate-chipFly">${stake}</span>
      )}
      {won && winAmount != null && winAmount > 0 && (
        <span className="tnum absolute -top-2.5 right-3 rounded-full bg-tie-green px-2 py-0.5 text-[11px] font-bold text-charcoal shadow-chip animate-chipFly">
          +${Math.round(winAmount)}
        </span>
      )}
    </button>
  );
}

function SideSpot({ name, pay, edge, stake, result, onClick, disabled }: { name: string; pay: string; edge: number | null; stake: number; result?: { won: boolean; payout: number; net: number }; onClick: () => void; disabled: boolean }) {
  const settled = result !== undefined;
  const border = settled ? (result!.won ? 'border-tie-green/70' : 'border-banker-red/50') : 'border-white/10';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-start rounded-lg border ${border} bg-black/20 p-2 text-left transition-all hover:bg-black/35 disabled:cursor-default`}
    >
      <span className="text-[12px] font-semibold text-white/80">{name}</span>
      <span className="tnum text-[10px] text-white/55">{pay}</span>
      {edge != null && <span className="tnum text-[9px] text-white/45">{edge}% edge</span>}
      {stake > 0 && <span className="tnum absolute right-1.5 top-1.5 rounded-full bg-brass px-1.5 py-0.5 text-[10px] font-bold text-charcoal">${stake}</span>}
      {settled && (
        <span className={`tnum mt-1 text-[11px] font-bold ${result!.won ? 'text-tie-green' : 'text-banker-red'}`}>
          {result!.won ? `WIN ${result!.payout}:1` : 'lose'}
        </span>
      )}
    </button>
  );
}
