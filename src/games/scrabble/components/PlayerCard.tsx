import type { PlayerIndex, PlayerStats } from '../game';
import { PLAYER_ACCENT } from './theme';

type Props = {
  player: PlayerIndex;
  name: string;
  stats: PlayerStats;
  active: boolean;
  leading: boolean;
  onRename: (name: string) => void;
  onActivate: () => void;
};

export function PlayerCard({ player, name, stats, active, leading, onRename, onActivate }: Props) {
  const accent = PLAYER_ACCENT[player];

  return (
    <div
      className={`rounded-2xl border bg-stone-900/70 p-4 transition-colors ${
        active ? 'border-transparent' : 'border-white/10'
      }`}
      style={active ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <input
          value={name}
          onChange={(e) => onRename(e.target.value)}
          aria-label={`Player ${player + 1} name`}
          maxLength={24}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold tracking-wide text-stone-100 outline-none transition-colors hover:border-white/15 focus:border-white/30 focus:bg-black/30"
        />
        {leading && (
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Leading
          </span>
        )}
      </div>

      <div className="mt-1 px-2">
        <div className="text-4xl font-extrabold tnum" style={{ color: accent }}>
          {stats.total}
        </div>
        <dl className="mt-2 flex gap-4 text-[11px] uppercase tracking-wider text-stone-400">
          <div>
            <dt className="inline">Plays </dt>
            <dd className="inline font-bold text-stone-200 tnum">{stats.plays}</dd>
          </div>
          <div>
            <dt className="inline">Avg </dt>
            <dd className="inline font-bold text-stone-200 tnum">{stats.average}</dd>
          </div>
          <div>
            <dt className="inline">Best </dt>
            <dd className="inline font-bold text-stone-200 tnum">{stats.best}</dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={onActivate}
        disabled={active}
        className={`mt-3 w-full rounded-lg py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
          active
            ? 'cursor-default bg-white/5 text-stone-400'
            : 'bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white'
        }`}
      >
        {active ? 'Their turn' : 'Make it their turn'}
      </button>
    </div>
  );
}
