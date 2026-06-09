import { useState } from 'react';
import { useConfig } from '../store/config';
import {
  SIDE_BETS,
  PERFECT_PAIR_EDGES,
  SMALL_TIGER_EDGES,
  SUPER6_EDGES,
  type SideBetCatalogEntry,
} from '../engine/sidebets';

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { config, setConfig, toggleSideBet, resetConfig } = useConfig();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative h-full w-[380px] max-w-[90vw] overflow-y-auto border-l border-brass/30 bg-charcoal-2 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold brass-text">Table Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="-m-3 p-3 text-white/50 hover:text-white">✕</button>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Base format</h3>
          <div className="flex gap-2">
            {(['commission', 'noCommission'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setConfig((p) => ({ ...p, baseFormat: f }))}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  config.baseFormat === f
                    ? 'border-brass bg-brass/15 text-bone'
                    : 'border-white/10 text-white/55 hover:border-white/25'
                }`}
              >
                {f === 'commission' ? 'Commission (5%)' : 'No-Commission'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/40">
            {config.baseFormat === 'commission'
              ? 'Banker wins pay 0.95:1. Tie pays 8:1.'
              : 'Banker wins pay even money, except a Banker 6 pays 1:2.'}
          </p>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Configurable payouts</h3>

          <PayoutSelect
            label="Perfect Pair"
            value={config.sideBets.perfectPairPay}
            options={[25, 26, 27, 28]}
            edges={PERFECT_PAIR_EDGES}
            onChange={(v) => setConfig((p) => ({ ...p, sideBets: { ...p.sideBets, perfectPairPay: v as 25 } }))}
          />
          <PayoutSelect
            label="Small Tiger"
            value={config.sideBets.smallTigerPay}
            options={[20, 22, 23]}
            edges={SMALL_TIGER_EDGES}
            onChange={(v) => setConfig((p) => ({ ...p, sideBets: { ...p.sideBets, smallTigerPay: v as 22 } }))}
          />
          <PayoutSelect
            label="Super 6 (flat)"
            value={config.sideBets.super6Pay}
            options={[12, 13, 14, 15, 16, 17]}
            edges={SUPER6_EDGES}
            onChange={(v) => setConfig((p) => ({ ...p, sideBets: { ...p.sideBets, super6Pay: v as 12 } }))}
          />
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Enabled side bets</h3>
          <div className="grid grid-cols-1 gap-1.5">
            {SIDE_BETS.map((b) => (
              <SideBetRow
                key={b.id}
                bet={b}
                on={config.enabledSideBets.includes(b.id)}
                onToggle={() => toggleSideBet(b.id)}
                showInfo={config.showTips}
              />
            ))}
          </div>
          {config.showTips && (
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">
              Tap the ⓘ beside a bet to see how it works.
            </p>
          )}
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Player mode</h3>
          <label className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm text-white/75">
            Starting bankroll
            <input
              type="number"
              min={100}
              step={100}
              value={config.startingBankroll}
              onChange={(e) => setConfig((p) => ({ ...p, startingBankroll: Math.max(100, Number(e.target.value) || 100) }))}
              className="tnum w-28 rounded bg-black/40 px-2 py-1 text-right text-bone outline-none ring-1 ring-white/10 focus:ring-brass"
            />
          </label>
          <label className="mt-1.5 flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm text-white/75">
            Show coaching tips
            <input
              type="checkbox"
              checked={config.showTips}
              onChange={(e) => setConfig((p) => ({ ...p, showTips: e.target.checked }))}
              className="h-4 w-4 cursor-pointer accent-brass"
            />
          </label>
          <label className="mt-1.5 flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm text-white/75">
            <span>
              Squeeze the cards
              <span className="ml-2 text-[11px] text-white/50">tap to reveal, slow deal</span>
            </span>
            <input
              type="checkbox"
              checked={config.squeeze}
              onChange={(e) => setConfig((p) => ({ ...p, squeeze: e.target.checked }))}
              className="h-4 w-4 cursor-pointer accent-brass"
            />
          </label>
        </section>

        <button
          onClick={resetConfig}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white/55 hover:border-banker-red/60 hover:text-banker-red"
        >
          Reset settings to defaults
        </button>
      </div>
    </div>
  );
}

function SideBetRow({
  bet,
  on,
  onToggle,
  showInfo,
}: {
  bet: SideBetCatalogEntry;
  on: boolean;
  onToggle: () => void;
  showInfo: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg bg-black/20">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-2 text-sm text-white/75">
          {bet.displayName}
          {showInfo && (
            <button
              type="button"
              aria-label={`How ${bet.displayName} works`}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className={`relative flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-colors before:absolute before:-inset-3 before:content-[''] ${
                open
                  ? 'border-brass bg-brass/15 text-brass'
                  : 'border-brass/45 text-brass/75 hover:border-brass hover:text-brass'
              }`}
            >
              i
            </button>
          )}
          <span className="text-[11px] text-white/50">
            {bet.houseEdge != null ? `${bet.houseEdge}% edge` : 'edge n/p'}
          </span>
        </span>
        <label className="-m-2 cursor-pointer p-2">
          <input type="checkbox" checked={on} onChange={onToggle} className="h-4 w-4 cursor-pointer accent-brass" />
        </label>
      </div>
      {showInfo && open && (
        <div className="border-t border-white/5 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-white/65">{bet.winCondition}</p>
          <p className="mt-1 text-[11px] text-brass/80">Pays {bet.payoutDescription}.</p>
          {bet.notes && <p className="mt-1 text-[10px] leading-relaxed text-white/50">{bet.notes}</p>}
        </div>
      )}
    </div>
  );
}

function PayoutSelect({
  label,
  value,
  options,
  edges,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  edges: Record<number, number>;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2 rounded-lg bg-black/20 px-3 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-white/75">{label}</span>
        <span className="tnum text-[11px] text-brass">{edges[value]}% edge</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`tnum rounded px-2 py-1 text-xs transition-colors ${
              value === o ? 'bg-brass text-charcoal' : 'bg-white/5 text-white/55 hover:bg-white/10'
            }`}
          >
            {o}:1
          </button>
        ))}
      </div>
    </div>
  );
}
