import { useState } from 'react';
import { endGameAdjustments, parseWord } from '../tiles';
import { PLAYER_ACCENT } from './theme';

type Props = {
  names: [string, string];
  onCancel: () => void;
  onFinish: (racks: [string, string], adjustments: [number, number]) => void;
};

/**
 * Closes out a game: whoever plays their last tile takes the value of the
 * opponent's leftovers, and anyone still holding tiles loses theirs.
 */
export function EndGamePanel({ names, onCancel, onFinish }: Props) {
  const [racks, setRacks] = useState<[string, string]>(['', '']);
  const adjustments = endGameAdjustments(racks[0], racks[1]);

  return (
    <section className="rounded-2xl border border-emerald-400/30 bg-stone-900/70 p-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Finish the game</h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-400">
        Enter the tiles each player still holds. Leave a rack empty for whoever went out — they collect the
        other rack&rsquo;s value.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {([0, 1] as const).map((p) => (
          <div key={p}>
            <label
              htmlFor={`rack-${p}`}
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: PLAYER_ACCENT[p] }}
            >
              {names[p]}&rsquo;s leftover tiles
            </label>
            <input
              id={`rack-${p}`}
              value={racks[p]}
              onChange={(e) =>
                setRacks((prev) => {
                  const next: [string, string] = [prev[0], prev[1]];
                  next[p] = e.target.value;
                  return next;
                })
              }
              placeholder="e.g. QVN"
              autoComplete="off"
              spellCheck={false}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-lg font-semibold uppercase tracking-[0.15em] text-stone-100 outline-none focus:border-white/35"
            />
            <div className="mt-1 text-xs text-stone-400 tnum">
              {parseWord(racks[p]).length === 0 ? 'Went out' : `${parseWord(racks[p]).length} tiles`} ·{' '}
              <span className={adjustments[p] < 0 ? 'text-rose-400' : 'text-emerald-300'}>
                {adjustments[p] > 0 ? `+${adjustments[p]}` : adjustments[p]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-stone-300 transition-colors hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onFinish(racks, adjustments)}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-stone-900 transition-colors hover:bg-emerald-400"
        >
          Apply &amp; finish
        </button>
      </div>
    </section>
  );
}
