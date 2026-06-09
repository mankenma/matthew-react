import { useMemo, useRef, useState } from 'react';
import { useConfig } from '../../store/config';
import { usePersistentState } from '../../store/persist';
import { useDealer } from '../../store/useDealer';
import type { HandResolution, Winner } from '../../engine/rules';
import { cardValue } from '../../engine/cards';
import { SIDE_BETS, type SideBetId, type SideBetCatalogEntry, resolveSideBet, sideBetById } from '../../engine/sidebets';
import { Hand } from '../../components/table/Hand';

type Difficulty = 'easy' | 'hard';
type Phase = 'idle' | 'playerDecision' | 'bankerDecision' | 'totals' | 'callWinner' | 'sideBets' | 'review';

interface DealerStats {
  decisions: number;
  correct: number;
  streak: number;
  best: number;
  bankerRowMiss: Record<number, number>;
  sideMiss: Partial<Record<SideBetId, number>>;
}

const ZERO: DealerStats = { decisions: 0, correct: 0, streak: 0, best: 0, bankerRowMiss: {}, sideMiss: {} };

interface Graded {
  label: string;
  correct: boolean;
  explanation: string;
}

function payoutOptions(id: SideBetId): number[] {
  switch (id) {
    case 'playerPair':
    case 'bankerPair':
      return [11];
    case 'eitherPair':
      return [5];
    case 'perfectPair':
      return [25, 26, 27, 28];
    case 'smallTiger':
      return [20, 22, 23];
    case 'bigTiger':
      return [50];
    case 'tiger':
    case 'lucky6':
      return [12, 20];
    case 'tigerPair':
      return [4, 20, 100];
    case 'tigerTie':
      return [35];
    case 'super6':
      return [12, 13, 14, 15, 16, 17];
    case 'lucky7':
      return [6, 15];
    case 'superLucky7':
      return [100];
  }
}

export function DealerMode() {
  const { config } = useConfig();
  const { deal, status } = useDealer();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [alwaysAll, setAlwaysAll] = useState(false);
  const [stats, setStats, resetStats] = usePersistentState<DealerStats>('bt:dealerStats', ZERO);

  const [phase, setPhase] = useState<Phase>('idle');
  const [res, setRes] = useState<HandResolution | null>(null);
  const [revealP, setRevealP] = useState(2);
  const [revealB, setRevealB] = useState(2);
  const [active, setActive] = useState<SideBetId[]>([]);

  // user inputs for the round
  const playerDecision = useRef<boolean | null>(null);
  const bankerDecision = useRef<boolean | null>(null);
  const playerTotalGuess = useRef<number | null>(null);
  const bankerTotalGuess = useRef<number | null>(null);
  const winnerCall = useRef<Winner | null>(null);
  const [sideFlags, setSideFlags] = useState<Partial<Record<SideBetId, { won: boolean; payout?: number }>>>({});
  const [graded, setGraded] = useState<Graded[]>([]);

  const enabled = useMemo(() => SIDE_BETS.filter((b) => config.enabledSideBets.includes(b.id)), [config.enabledSideBets]);

  const acc = stats.decisions ? (100 * stats.correct) / stats.decisions : 0;

  function chooseActive(): SideBetId[] {
    if (alwaysAll) return enabled.map((b) => b.id);
    const picks: SideBetId[] = [];
    for (const b of enabled) {
      const weak = (stats.sideMiss[b.id] || 0) > 0;
      const p = weak ? 0.78 : 0.5;
      if (Math.random() < p) picks.push(b.id);
    }
    if (picks.length === 0 && enabled.length) picks.push(enabled[Math.floor(Math.random() * enabled.length)].id);
    return picks;
  }

  function newRound() {
    const r = deal();
    setRes(r);
    setActive(chooseActive());
    setSideFlags({});
    setGraded([]);
    playerDecision.current = null;
    bankerDecision.current = null;
    playerTotalGuess.current = null;
    bankerTotalGuess.current = null;
    winnerCall.current = null;

    if (difficulty === 'easy') {
      setRevealP(r.player.cards.length);
      setRevealB(r.banker.cards.length);
      setPhase('callWinner');
    } else {
      setRevealP(2);
      setRevealB(2);
      if (r.natural) setPhase('totals');
      else setPhase('playerDecision');
    }
  }

  function answerPlayerDecision(draw: boolean) {
    if (!res) return;
    playerDecision.current = draw;
    if (res.player.drewThird) setRevealP(3);
    setPhase('bankerDecision');
  }

  function answerBankerDecision(draw: boolean) {
    if (!res) return;
    bankerDecision.current = draw;
    if (res.banker.drewThird) setRevealB(3);
    setPhase('totals');
  }

  function answerTotals(playerTotal: number, bankerTotal: number) {
    if (!res) return;
    playerTotalGuess.current = playerTotal;
    bankerTotalGuess.current = bankerTotal;
    // reveal every card so the winner call uses the full board
    setRevealP(res.player.cards.length);
    setRevealB(res.banker.cards.length);
    setPhase('callWinner');
  }

  function answerWinner(w: Winner) {
    if (!res) return;
    winnerCall.current = w;
    setRevealP(res.player.cards.length);
    setRevealB(res.banker.cards.length);
    if (active.length > 0) setPhase('sideBets');
    else finishRound(w);
  }

  function setFlag(id: SideBetId, won: boolean) {
    setSideFlags((s) => ({ ...s, [id]: { won, payout: won ? s[id]?.payout : undefined } }));
  }
  function setPayout(id: SideBetId, payout: number) {
    setSideFlags((s) => ({ ...s, [id]: { won: true, payout } }));
  }

  function finishRound(winnerOverride?: Winner) {
    if (!res) return;
    const g: Graded[] = [];
    const playerTwo = (res.player.cards[0] ? sumTwo(res) : 0);

    if (difficulty === 'hard' && !res.natural) {
      const pCorrect = playerDecision.current === res.player.drewThird;
      g.push({
        label: 'Player draw/stand',
        correct: pCorrect,
        explanation: `Player two-card total ${playerTwo} → ${res.player.drewThird ? 'draw' : 'stand'} (rule: draw 0–5, stand 6–7).`,
      });
      const bankerTwo = twoTotal(res.banker.cards);
      const bCorrect = bankerDecision.current === res.banker.drewThird;
      let bExpl: string;
      if (!res.player.drewThird) {
        bExpl = `Player stood; Banker ${bankerTwo} → ${res.banker.drewThird ? 'draw' : 'stand'} (Case A: draw 0–5, stand 6–7).`;
      } else {
        const third = res.player.cards[2] ? cardValue(res.player.cards[2]) : 0;
        bExpl = `Banker ${bankerTwo}, Player's third card was ${third} → table says ${res.banker.drewThird ? 'draw' : 'stand'}.`;
      }
      g.push({ label: 'Banker draw/stand', correct: bCorrect, explanation: bExpl });
    }

    if (difficulty === 'hard') {
      g.push({
        label: 'Player total',
        correct: playerTotalGuess.current === res.player.total,
        explanation: `Player's cards total ${res.player.total} (sum of values, mod 10).`,
      });
      g.push({
        label: 'Banker total',
        correct: bankerTotalGuess.current === res.banker.total,
        explanation: `Banker's cards total ${res.banker.total} (sum of values, mod 10).`,
      });
    }

    const w = winnerOverride ?? winnerCall.current!;
    const wCorrect = w === res.winner;
    g.push({
      label: 'Call the winner',
      correct: wCorrect,
      explanation: `Player ${res.player.total} vs Banker ${res.banker.total} → ${res.winner}.`,
    });

    for (const id of active) {
      const truth = resolveSideBet(id, res, config.sideBets);
      const entry = sideBetById(id);
      const flag = sideFlags[id];
      const flaggedWon = flag?.won ?? false;
      const flagCorrect = flaggedWon === truth.won;
      let correct = flagCorrect;
      let expl = truth.won
        ? `${entry.displayName} wins — ${truth.detail}. Pays ${truth.payout}:1.`
        : `${entry.displayName} loses (${entry.winCondition}).`;

      if (difficulty === 'hard' && truth.won) {
        const payCorrect = flag?.payout === truth.payout;
        correct = flagCorrect && payCorrect;
        if (flagCorrect && !payCorrect) {
          expl += ` You marked ${flag?.payout ?? '—'}:1.`;
        }
      }
      // teaching nuggets for the high-frequency confusions
      if ((id === 'tiger' || id === 'lucky6') && truth.won) {
        expl += res.banker.cards.length === 3 ? ' (three-card 6 → 20:1)' : ' (two-card 6 → 12:1)';
      }
      if (id === 'smallTiger' && !truth.won && res.winner === 'Banker' && res.banker.total === 6 && res.banker.cards.length === 3) {
        expl += ' Small Tiger needs a TWO-card 6 — this was three cards.';
      }
      g.push({ label: entry.displayName, correct, explanation: expl });
    }

    // apply stats
    setStats((st) => {
      const next: DealerStats = {
        ...st,
        bankerRowMiss: { ...st.bankerRowMiss },
        sideMiss: { ...st.sideMiss },
      };
      for (const item of g) {
        next.decisions += 1;
        if (item.correct) {
          next.correct += 1;
          next.streak += 1;
          if (next.streak > next.best) next.best = next.streak;
        } else {
          next.streak = 0;
        }
      }
      // weak-spot attribution
      if (difficulty === 'hard' && !res.natural) {
        const bankerTwo = twoTotal(res.banker.cards);
        const bItem = g.find((x) => x.label === 'Banker draw/stand');
        if (bItem && !bItem.correct) next.bankerRowMiss[bankerTwo] = (next.bankerRowMiss[bankerTwo] || 0) + 1;
      }
      for (const id of active) {
        const item = g.find((x) => x.label === sideBetById(id).displayName);
        if (item && !item.correct) next.sideMiss[id] = (next.sideMiss[id] || 0) + 1;
      }
      return next;
    });

    setGraded(g);
    setPhase('review');
  }

  const isWinner = (label: 'Player' | 'Banker') => phase === 'review' && res?.winner === label;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
      <div className="felt-surface rounded-3xl border border-brass/20 p-5">
        {/* controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(['easy', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                disabled={phase !== 'idle' && phase !== 'review'}
                className={`rounded-lg border px-4 py-1.5 text-sm capitalize transition-colors disabled:opacity-40 ${
                  difficulty === d ? 'border-brass bg-brass/15 text-bone' : 'border-white/10 text-white/55'
                }`}
              >
                {d}
              </button>
            ))}
            <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-[11px] text-white/60">
              <input type="checkbox" checked={alwaysAll} onChange={(e) => setAlwaysAll(e.target.checked)} className="h-4 w-4 cursor-pointer accent-brass" />
              evaluate all side bets
            </label>
          </div>
          <div className="text-xs text-white/55">
            Shoe: <span className="tnum">{status.remaining}</span>
            {status.cutReached && <span className="ml-2 text-brass">cut card</span>}
          </div>
        </div>

        {/* hands */}
        <div className="mb-5 flex items-start justify-center gap-8">
          <Hand label="Player" cards={res?.player.cards ?? []} total={res && phase === 'review' ? res.player.total : phase !== 'idle' && phase !== 'totals' && revealP >= (res?.player.cards.length ?? 0) ? res?.player.total ?? null : null} revealCount={revealP} isWinner={isWinner('Player')} />
          <div className="self-center font-display text-2xl text-white/20">vs</div>
          <Hand label="Banker" cards={res?.banker.cards ?? []} total={res && phase === 'review' ? res.banker.total : phase !== 'idle' && phase !== 'totals' && revealB >= (res?.banker.cards.length ?? 0) ? res?.banker.total ?? null : null} revealCount={revealB} isWinner={isWinner('Banker')} />
        </div>

        {/* prompt area */}
        <div className="min-h-[120px] rounded-2xl border border-white/5 bg-black/20 p-4">
          {phase === 'idle' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-6">
              <p className="text-sm text-white/50">
                {difficulty === 'easy' ? 'Deal a hand and call the winner, then resolve the side bets.' : 'Make each draw/stand decision, call the winner, then pay the side bets.'}
              </p>
              <button onClick={newRound} className="rounded-lg bg-brass px-6 py-2 text-sm font-bold text-charcoal">Deal</button>
            </div>
          )}

          {phase === 'playerDecision' && (
            <Prompt title="Player: draw or stand?">
              <DecisionButtons onDraw={() => answerPlayerDecision(true)} onStand={() => answerPlayerDecision(false)} />
            </Prompt>
          )}

          {phase === 'bankerDecision' && (
            <Prompt title="Banker: draw or stand?">
              <DecisionButtons onDraw={() => answerBankerDecision(true)} onStand={() => answerBankerDecision(false)} />
            </Prompt>
          )}

          {phase === 'totals' && <TotalsPrompt onSubmit={answerTotals} />}

          {phase === 'callWinner' && (
            <Prompt title="Who wins?">
              <div className="flex flex-wrap justify-center gap-3">
                <CallButton label="Player" accent="player" onClick={() => answerWinner('Player')} />
                <CallButton label="Tie" accent="tie" onClick={() => answerWinner('Tie')} />
                <CallButton label="Banker" accent="banker" onClick={() => answerWinner('Banker')} />
              </div>
            </Prompt>
          )}

          {phase === 'sideBets' && (
            <div>
              <div className="mb-3 text-center text-sm font-semibold text-white/65">
                Resolve each active side bet {difficulty === 'hard' ? '— flag and pay' : '— flag win or lose'}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {active.map((id) => (
                  <ResolveCard
                    key={id}
                    entry={sideBetById(id)}
                    flag={sideFlags[id]}
                    difficulty={difficulty}
                    showInfo={difficulty === 'easy'}
                    onFlag={(won) => setFlag(id, won)}
                    onPayout={(p) => setPayout(id, p)}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => finishRound()}
                  disabled={!active.every((id) => sideFlags[id] && (difficulty === 'easy' || sideFlags[id]!.won === false || sideFlags[id]!.payout != null))}
                  className="rounded-lg bg-brass px-6 py-2 text-sm font-bold text-charcoal disabled:opacity-30"
                >
                  Check answers
                </button>
              </div>
            </div>
          )}

          {phase === 'review' && (
            <div>
              <div className="mb-3 space-y-1.5">
                {graded.map((g, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[12px] ${g.correct ? 'bg-tie-green/10' : 'bg-banker-red/10'}`}>
                    <span className={`mt-0.5 font-bold ${g.correct ? 'text-tie-green' : 'text-banker-red'}`}>{g.correct ? '✓' : '✕'}</span>
                    <span>
                      <span className="font-semibold text-white/80">{g.label}: </span>
                      <span className="text-white/60">{g.explanation}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <button onClick={newRound} className="rounded-lg bg-brass px-6 py-2 text-sm font-bold text-charcoal">Next hand</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/5 bg-charcoal-2/70 p-4 gold-edge">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white/70">Drill stats</h3>
            <button onClick={resetStats} className="-m-2 p-2 text-[11px] text-white/55 hover:text-banker-red">reset</button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Accuracy" value={`${acc.toFixed(0)}%`} />
            <Metric label="Streak" value={stats.streak.toString()} />
            <Metric label="Best" value={stats.best.toString()} />
          </div>
          <div className="mt-1 text-center text-[11px] text-white/50 tnum">
            {stats.correct}/{stats.decisions} decisions
          </div>
        </div>

        <WeakSpots stats={stats} />
      </div>
    </div>
  );
}

function WeakSpots({ stats }: { stats: DealerStats }) {
  const bankerRows = Object.entries(stats.bankerRowMiss).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const sides = Object.entries(stats.sideMiss).filter(([, n]) => (n as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number));
  if (bankerRows.length === 0 && sides.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-charcoal-2/70 p-4 gold-edge text-[12px] text-white/55">
        <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-widest text-white/70">Weak spots</h3>
        No misses yet — play a few hands and your trouble areas will surface here (and resurface more often).
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/5 bg-charcoal-2/70 p-4 gold-edge">
      <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-widest text-white/70">Weak spots</h3>
      {bankerRows.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Banker table rows</div>
          <div className="flex flex-wrap gap-1.5">
            {bankerRows.map(([total, n]) => (
              <span key={total} className="tnum rounded bg-banker-red/15 px-2 py-0.5 text-[11px] text-banker-red">Banker {total} · {n as number}×</span>
            ))}
          </div>
        </div>
      )}
      {sides.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Side bets</div>
          <div className="flex flex-wrap gap-1.5">
            {sides.map(([id, n]) => (
              <span key={id} className="tnum rounded bg-banker-red/15 px-2 py-0.5 text-[11px] text-banker-red">{sideBetById(id as SideBetId).displayName} · {n as number}×</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResolveCard({
  entry,
  flag,
  difficulty,
  showInfo,
  onFlag,
  onPayout,
}: {
  entry: SideBetCatalogEntry;
  flag?: { won: boolean; payout?: number };
  difficulty: Difficulty;
  showInfo: boolean;
  onFlag: (won: boolean) => void;
  onPayout: (payout: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-white/80">
          {entry.displayName}
          {showInfo && (
            <button
              type="button"
              aria-label={`How ${entry.displayName} works`}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-colors ${
                open
                  ? 'border-brass bg-brass/15 text-brass'
                  : 'border-brass/45 text-brass/75 hover:border-brass hover:text-brass'
              }`}
            >
              i
            </button>
          )}
        </span>
        <span className="tnum text-[10px] text-white/50">{entry.payoutDescription}</span>
      </div>
      {showInfo && open && (
        <div className="mb-2 rounded-md bg-black/30 px-2.5 py-2">
          <p className="text-[11px] leading-relaxed text-white/65">{entry.winCondition}</p>
          <p className="mt-1 text-[11px] text-brass/80">Pays {entry.payoutDescription}.</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onFlag(true)} className={`flex-1 rounded px-2 py-1 text-xs font-semibold ${flag?.won === true ? 'bg-tie-green text-charcoal' : 'bg-white/5 text-white/55'}`}>Win</button>
        <button onClick={() => onFlag(false)} className={`flex-1 rounded px-2 py-1 text-xs font-semibold ${flag?.won === false ? 'bg-banker-red text-white' : 'bg-white/5 text-white/55'}`}>Lose</button>
      </div>
      {difficulty === 'hard' && flag?.won === true && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {payoutOptions(entry.id).map((p) => (
            <button key={p} onClick={() => onPayout(p)} className={`tnum rounded px-2 py-0.5 text-[11px] ${flag.payout === p ? 'bg-brass text-charcoal' : 'bg-white/5 text-white/55'}`}>{p}:1</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Prompt({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-3">
      <div className="font-display text-lg font-semibold text-bone">{title}</div>
      {children}
    </div>
  );
}

function TotalsPrompt({ onSubmit }: { onSubmit: (playerTotal: number, bankerTotal: number) => void }) {
  const [p, setP] = useState('');
  const [b, setB] = useState('');
  const valid = p !== '' && b !== '';
  function submit() {
    if (valid) onSubmit(Number(p), Number(b));
  }
  return (
    <Prompt title="What is each hand's total?">
      <div className="flex items-end justify-center gap-8">
        <TotalField label="Player" accent="player" value={p} onChange={setP} onEnter={submit} />
        <TotalField label="Banker" accent="banker" value={b} onChange={setB} onEnter={submit} />
      </div>
      <button
        onClick={submit}
        disabled={!valid}
        className="rounded-lg bg-brass px-6 py-2 text-sm font-bold text-charcoal disabled:opacity-30"
      >
        Confirm totals
      </button>
      <p className="text-[11px] text-white/50">Sum each hand's card values, then take the last digit (mod 10).</p>
    </Prompt>
  );
}

function TotalField({
  label,
  accent,
  value,
  onChange,
  onEnter,
}: {
  label: string;
  accent: 'player' | 'banker';
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const cls = accent === 'player' ? 'text-player-blue' : 'text-banker-red';
  return (
    <label className="flex flex-col items-center gap-1.5">
      <span className={`font-display text-sm font-bold ${cls}`}>{label}</span>
      <input
        type="number"
        min={0}
        max={9}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const digit = e.target.value.slice(-1).replace(/[^0-9]/, '');
          onChange(digit);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter();
        }}
        className="tnum h-16 w-16 rounded-xl border border-white/15 bg-black/40 text-center text-3xl font-bold text-bone outline-none focus:border-brass focus:ring-1 focus:ring-brass"
      />
    </label>
  );
}

function DecisionButtons({ onDraw, onStand }: { onDraw: () => void; onStand: () => void }) {
  return (
    <div className="flex gap-3">
      <button onClick={onDraw} className="rounded-lg border border-brass/50 bg-brass/10 px-6 py-2 text-sm font-bold text-bone hover:bg-brass/20">Draw</button>
      <button onClick={onStand} className="rounded-lg border border-white/20 bg-white/5 px-6 py-2 text-sm font-bold text-bone hover:bg-white/10">Stand</button>
    </div>
  );
}

function CallButton({ label, accent, onClick }: { label: string; accent: 'player' | 'banker' | 'tie'; onClick: () => void }) {
  const cls = accent === 'player' ? 'border-player-blue/60 text-player-blue' : accent === 'banker' ? 'border-banker-red/60 text-banker-red' : 'border-tie-green/60 text-tie-green';
  return (
    <button onClick={onClick} className={`rounded-lg border ${cls} bg-black/30 px-6 py-2 font-display text-base font-bold hover:bg-black/50`}>{label}</button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/25 py-2">
      <div className="tnum text-xl font-bold brass-text">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}

// helpers
function twoTotal(cards: { rank: string }[]): number {
  return twoTotalVals(cards.slice(0, 2));
}
function twoTotalVals(cards: { rank: string }[]): number {
  const v = (r: string) => (r === 'A' ? 1 : r === '10' || r === 'J' || r === 'Q' || r === 'K' ? 0 : Number(r));
  return (v(cards[0].rank) + v(cards[1].rank)) % 10;
}
function sumTwo(res: HandResolution): number {
  return twoTotal(res.player.cards);
}
