import { useMemo, useState } from 'react';
import type { LetterMod } from '../tiles';
import { BINGO_BONUS, BINGO_TILE_COUNT, parseWord, scoreWord } from '../tiles';
import type { PlayerIndex } from '../game';
import { PLAYER_ACCENT } from './theme';
import { TileRack } from './TileRack';

const MOD_CYCLE: LetterMod[] = ['none', 'DL', 'TL', 'blank'];

const WORD_MULTIPLIERS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: '×1', hint: 'No word premium' },
  { value: 2, label: '×2', hint: 'Double word' },
  { value: 3, label: '×3', hint: 'Triple word' },
  { value: 4, label: '×4', hint: 'Two double-word squares' },
  { value: 6, label: '×6', hint: 'Double and triple word' },
  { value: 9, label: '×9', hint: 'Two triple-word squares' },
];

type Props = {
  player: PlayerIndex;
  name: string;
  disabled: boolean;
  onSubmit: (word: string, points: number) => void;
};

export function TurnEntry({ player, name, disabled, onSubmit }: Props) {
  const [word, setWord] = useState('');
  const [mods, setMods] = useState<LetterMod[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [bingoOverride, setBingoOverride] = useState<boolean | null>(null);
  const [manual, setManual] = useState('');

  const accent = PLAYER_ACCENT[player];
  const letters = useMemo(() => parseWord(word), [word]);
  const usingWord = letters.length > 0;
  const bingo = bingoOverride ?? letters.length >= BINGO_TILE_COUNT;

  const computed = useMemo(
    () =>
      scoreWord(
        letters.map((letter, i) => ({ letter, mod: letter === '?' ? 'blank' : mods[i] ?? 'none' })),
        multiplier,
        bingo,
      ),
    [letters, mods, multiplier, bingo],
  );

  const manualPoints = Number.parseInt(manual, 10);
  const points = usingWord ? computed : Number.isNaN(manualPoints) ? 0 : manualPoints;
  const canSubmit = !disabled && (usingWord || manual.trim() !== '');

  function reset() {
    setWord('');
    setMods([]);
    setMultiplier(1);
    setBingoOverride(null);
    setManual('');
  }

  function submit(override?: number) {
    if (disabled) return;
    const value = override ?? points;
    if (override === undefined && !canSubmit) return;
    onSubmit(override === undefined && usingWord ? letters.join('') : '', value);
    reset();
  }

  function cycleMod(index: number) {
    setMods((prev) => {
      const next = [...prev];
      while (next.length < letters.length) next.push('none');
      const at = MOD_CYCLE.indexOf(next[index] ?? 'none');
      next[index] = MOD_CYCLE[(at + 1) % MOD_CYCLE.length];
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-stone-900/70 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
          {name}&rsquo;s turn
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-stone-500">Blank tile: type ?</span>
      </div>

      <input
        value={word}
        onChange={(e) => {
          setWord(e.target.value);
          setBingoOverride(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        disabled={disabled}
        placeholder="Word played (optional)"
        aria-label="Word played"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-lg font-semibold uppercase tracking-[0.15em] text-stone-100 outline-none transition-colors focus:border-white/35 disabled:opacity-50"
      />

      <TileRack letters={letters} mods={mods} onCycle={cycleMod} />

      {usingWord && (
        <div className="mt-1 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Word</span>
            {WORD_MULTIPLIERS.map((m) => (
              <button
                key={m.value}
                type="button"
                title={m.hint}
                onClick={() => setMultiplier(m.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  multiplier === m.value
                    ? 'bg-rose-500/80 text-white'
                    : 'bg-white/5 text-stone-300 hover:bg-white/10'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setBingoOverride(!bingo)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
              bingo ? 'bg-emerald-500/80 text-white' : 'bg-white/5 text-stone-300 hover:bg-white/10'
            }`}
          >
            Bingo +{BINGO_BONUS}
          </button>
        </div>
      )}

      <div className="mt-4 flex items-end gap-3">
        {usingWord ? (
          <div className="flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Score</div>
            <div className="text-4xl font-extrabold tnum" style={{ color: accent }}>
              {computed}
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <label
              htmlFor="manual-points"
              className="text-[11px] font-semibold uppercase tracking-wider text-stone-400"
            >
              Points
            </label>
            <input
              id="manual-points"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/[^\d-]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              disabled={disabled}
              inputMode="numeric"
              placeholder="0"
              className="mt-1 w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-2xl font-extrabold text-stone-100 outline-none transition-colors focus:border-white/35 tnum disabled:opacity-50"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => submit(0)}
            disabled={disabled}
            className="rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-stone-300 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            Pass
          </button>
          <button
            type="button"
            onClick={() => submit()}
            disabled={!canSubmit}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-stone-900 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            Add {points !== 0 ? points : ''}
          </button>
        </div>
      </div>
    </section>
  );
}
