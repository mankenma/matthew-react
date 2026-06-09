import { useMemo, useState } from 'react';
import { type RoadEntry, buildBigRoad, roadStats, BIG_ROAD_ROWS } from '../../engine/roads';

const COLORS = {
  Banker: '#b3262b',
  Player: '#3a6ea5',
  Tie: '#2f9e6f',
} as const;

function BeadPlate({ entries }: { entries: RoadEntry[] }) {
  const rows = 6;
  const cols = Math.max(8, Math.ceil(entries.length / rows) + 1);
  const cells: (RoadEntry | null)[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const idx = c * rows + r;
      cells.push(entries[idx] ?? null);
    }
  }
  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateRows: `repeat(${rows}, 18px)`, gridAutoFlow: 'column', gridAutoColumns: '18px' }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => {
        const col = Math.floor(i / rows);
        const row = i % rows;
        const e = cells[col * rows + row];
        return (
          <div key={i} className="flex items-center justify-center rounded-[3px] bg-black/25">
            {e && (
              <div
                className="relative flex h-[16px] w-[16px] items-center justify-center rounded-full text-[9px] font-bold text-white animate-popIn"
                style={{ background: COLORS[e.winner] }}
              >
                {e.winner === 'Banker' ? 'B' : e.winner === 'Player' ? 'P' : 'T'}
                {e.playerPair && <span className="absolute -left-[2px] -top-[2px] h-[5px] w-[5px] rounded-full bg-player-blue ring-1 ring-white/70" />}
                {e.bankerPair && <span className="absolute -bottom-[2px] -right-[2px] h-[5px] w-[5px] rounded-full bg-banker-red ring-1 ring-white/70" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BigRoad({ entries }: { entries: RoadEntry[] }) {
  const road = useMemo(() => buildBigRoad(entries), [entries]);
  const cols = Math.max(12, road.columns.length + 1);
  return (
    <div
      className="grid gap-[2px]"
      style={{ gridTemplateRows: `repeat(${BIG_ROAD_ROWS}, 18px)`, gridAutoFlow: 'column', gridAutoColumns: '18px' }}
    >
      {Array.from({ length: cols * BIG_ROAD_ROWS }).map((_, i) => {
        const col = Math.floor(i / BIG_ROAD_ROWS);
        const row = i % BIG_ROAD_ROWS;
        const cell = road.columns[col]?.[row];
        return (
          <div key={i} className="flex items-center justify-center rounded-[2px] bg-black/20">
            {cell && (
              <div
                className="relative h-[15px] w-[15px] rounded-full ring-2 animate-popIn"
                style={{ borderColor: COLORS[cell.winner], boxShadow: `inset 0 0 0 2px ${COLORS[cell.winner]}` }}
              >
                {cell.ties > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-tie-green">
                    /
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Scoreboard({ entries }: { entries: RoadEntry[] }) {
  const [showMyth, setShowMyth] = useState(false);
  const stats = useMemo(() => roadStats(entries), [entries]);

  return (
    <div className="rounded-2xl border border-white/5 bg-charcoal-2/70 p-4 gold-edge">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white/70">Scoreboard</h3>
        <button
          onClick={() => setShowMyth((v) => !v)}
          className="text-[11px] text-white/40 underline decoration-dotted underline-offset-2 hover:text-brass"
        >
          myth check
        </button>
      </div>

      <div className="space-y-4 overflow-x-auto">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Bead Plate</div>
          <BeadPlate entries={entries} />
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Big Road</div>
          <BigRoad entries={entries} />
        </div>
      </div>

      {showMyth && (
        <div className="mt-3 rounded-lg border border-brass/25 bg-black/30 p-3 text-[11px] leading-relaxed text-white/65">
          <span className="brass-text font-semibold">Trends are noise.</span> Each coup is independent — the longest
          streak so far is <span className="tnum">{stats.longestStreak}</span>, but past results carry no predictive
          power over the next hand. Banker {stats.bankerPct.toFixed(1)}% · Player {stats.playerPct.toFixed(1)}% · Tie{' '}
          {stats.tiePct.toFixed(1)}% over {stats.total} hands.
        </div>
      )}
    </div>
  );
}
