import type { Turn } from '../game';
import { PLAYER_ACCENT } from './theme';

type Props = {
  turns: Turn[];
  names: [string, string];
  onDelete: (id: string) => void;
};

export function History({ turns, names, onDelete }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-stone-900/70 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">History</h2>
        <span className="text-[11px] uppercase tracking-wider text-stone-500">
          {turns.length} {turns.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {turns.length === 0 ? (
        <p className="py-4 text-sm text-stone-500">No scores yet. The first play lands here.</p>
      ) : (
        <ol className="mt-2 divide-y divide-white/5">
          {[...turns].reverse().map((turn) => (
            <li key={turn.id} className="flex items-center gap-3 py-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PLAYER_ACCENT[turn.player] }}
                aria-hidden
              />
              <span className="w-24 shrink-0 truncate text-sm font-semibold text-stone-200">
                {names[turn.player]}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm tracking-wider text-stone-400">
                {turn.kind === 'adjustment'
                  ? 'Unplayed tiles'
                  : turn.word || (turn.points === 0 ? 'Passed' : 'Points entered')}
              </span>
              <span
                className={`w-14 shrink-0 text-right text-sm font-bold tnum ${
                  turn.points < 0 ? 'text-rose-400' : 'text-stone-100'
                }`}
              >
                {turn.points > 0 ? `+${turn.points}` : turn.points}
              </span>
              <button
                type="button"
                onClick={() => onDelete(turn.id)}
                aria-label={`Delete ${names[turn.player]}'s ${turn.points} point entry`}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-stone-500 transition-colors hover:bg-white/10 hover:text-rose-300"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
