import { useState } from 'react';
import { EndGamePanel } from './components/EndGamePanel';
import { History } from './components/History';
import { PlayerCard } from './components/PlayerCard';
import { TurnEntry } from './components/TurnEntry';
import { PLAYER_ACCENT } from './components/theme';
import type { Game, PlayerIndex, Turn } from './game';
import { STORAGE_KEY, leader, makeId, newGame, other, statsFor } from './game';
import { usePersistentState } from './usePersistentState';

export default function App() {
  const [game, setGame] = usePersistentState<Game>(STORAGE_KEY, newGame());
  const [closing, setClosing] = useState(false);

  const stats = [statsFor(game.turns, 0), statsFor(game.turns, 1)] as const;
  const ahead = leader(game.turns);

  function addTurn(word: string, points: number) {
    const turn: Turn = { id: makeId(), player: game.current, word, points, kind: 'play' };
    setGame((g) => ({ ...g, turns: [...g.turns, turn], current: other(g.current) }));
  }

  function deleteTurn(id: string) {
    setGame((g) => ({ ...g, turns: g.turns.filter((t) => t.id !== id) }));
  }

  function undoLast() {
    setGame((g) => {
      if (g.turns.length === 0) return g;
      const last = g.turns[g.turns.length - 1];
      return { ...g, turns: g.turns.slice(0, -1), current: last.player, finished: false };
    });
  }

  function rename(player: PlayerIndex, name: string) {
    setGame((g) => {
      const names: [string, string] = [g.names[0], g.names[1]];
      names[player] = name;
      return { ...g, names };
    });
  }

  function finish(racks: [string, string], adjustments: [number, number]) {
    setGame((g) => {
      const extra: Turn[] = ([0, 1] as const)
        .filter((p) => adjustments[p] !== 0)
        .map((p) => ({
          id: makeId(),
          player: p,
          word: racks[p].toUpperCase(),
          points: adjustments[p],
          kind: 'adjustment' as const,
        }));
      return { ...g, turns: [...g.turns, ...extra], finished: true };
    });
    setClosing(false);
  }

  function reset() {
    if (game.turns.length > 0 && !window.confirm('Start a new game? The current scores will be cleared.')) return;
    setGame((g) => ({ ...newGame(), names: g.names }));
    setClosing(false);
  }

  return (
    <div className="mx-auto min-h-full max-w-3xl px-4 py-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a
            href="/links"
            className="mb-1 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-amber-300"
          >
            ← Back to Links
          </a>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-100 sm:text-3xl">
            Scrabble <span className="text-amber-300">Scorekeeper</span>
          </h1>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-stone-500 sm:tracking-[0.25em]">
            Two players · saved on this device
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={undoLast}
            disabled={game.turns.length === 0}
            className="rounded-xl border border-white/10 bg-stone-900/70 px-3 py-2 text-xs font-semibold text-stone-300 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-white/10 bg-stone-900/70 px-3 py-2 text-xs font-semibold text-stone-300 transition-colors hover:bg-white/10"
          >
            New game
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {([0, 1] as const).map((p) => (
          <PlayerCard
            key={p}
            player={p}
            name={game.names[p]}
            stats={stats[p]}
            active={!game.finished && game.current === p}
            leading={ahead === p}
            onRename={(name) => rename(p, name)}
            onActivate={() => setGame((g) => ({ ...g, current: p }))}
          />
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {game.finished ? (
          <FinalResult game={game} onReopen={() => setGame((g) => ({ ...g, finished: false }))} onNewGame={reset} />
        ) : closing ? (
          <EndGamePanel names={game.names} onCancel={() => setClosing(false)} onFinish={finish} />
        ) : (
          <>
            <TurnEntry
              player={game.current}
              name={game.names[game.current]}
              disabled={false}
              onSubmit={addTurn}
            />
            <button
              type="button"
              onClick={() => setClosing(true)}
              className="w-full rounded-xl border border-white/10 bg-stone-900/50 py-2 text-xs font-semibold uppercase tracking-wider text-stone-400 transition-colors hover:bg-white/5 hover:text-emerald-300"
            >
              Finish game &amp; count leftover tiles
            </button>
          </>
        )}

        <History turns={game.turns} names={game.names} onDelete={deleteTurn} />
      </div>

      <footer className="mt-8 text-center text-[11px] leading-relaxed text-stone-500">
        Standard English tile values · bingo bonus +50 for using all seven tiles. Scores are kept in this
        browser only.
      </footer>
    </div>
  );
}

function FinalResult({ game, onReopen, onNewGame }: { game: Game; onReopen: () => void; onNewGame: () => void }) {
  const totals = [statsFor(game.turns, 0).total, statsFor(game.turns, 1).total] as const;
  const winner = leader(game.turns);

  return (
    <section className="rounded-2xl border border-amber-300/40 bg-stone-900/70 p-5 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-stone-500">Final</p>
      <h2 className="mt-1 text-2xl font-extrabold text-stone-100">
        {winner === null ? (
          'A tie'
        ) : (
          <>
            <span style={{ color: PLAYER_ACCENT[winner] }}>{game.names[winner]}</span> wins
          </>
        )}
      </h2>
      <p className="mt-1 text-lg font-bold text-stone-300 tnum">
        {totals[0]} – {totals[1]}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={onReopen}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-stone-300 transition-colors hover:bg-white/10"
        >
          Keep playing
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className="rounded-xl bg-amber-300 px-5 py-2 text-sm font-bold text-stone-900 transition-colors hover:bg-amber-200"
        >
          New game
        </button>
      </div>
    </section>
  );
}
