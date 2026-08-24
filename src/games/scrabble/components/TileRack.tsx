import type { LetterMod } from '../tiles';
import { tileValue } from '../tiles';

const MOD_LABEL: Record<LetterMod, string> = {
  none: '',
  DL: 'DL',
  TL: 'TL',
  blank: 'blank',
};

const MOD_STYLE: Record<LetterMod, string> = {
  none: 'border-transparent',
  DL: 'border-sky-400 shadow-[0_0_0_2px_rgba(56,189,248,0.35)]',
  TL: 'border-blue-600 shadow-[0_0_0_2px_rgba(37,99,235,0.4)]',
  blank: 'border-dashed border-stone-400',
};

type Props = {
  letters: string[];
  mods: LetterMod[];
  onCycle: (index: number) => void;
};

/** The typed word as clickable tiles — each click cycles its premium square. */
export function TileRack({ letters, mods, onCycle }: Props) {
  if (letters.length === 0) {
    return (
      <p className="py-3 text-sm text-stone-500">
        Type a word above to build it from tiles, or enter the points directly.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 py-2">
      {letters.map((letter, i) => {
        const mod = mods[i] ?? 'none';
        const blank = mod === 'blank' || letter === '?';
        const value = blank ? 0 : tileValue(letter);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCycle(i)}
            title="Click to cycle premium square: double letter, triple letter, blank"
            aria-label={`${letter === '?' ? 'Blank' : letter}, ${value} ${value === 1 ? 'point' : 'points'}${
              MOD_LABEL[mod] ? `, ${MOD_LABEL[mod]}` : ''
            }. Click to change premium square.`}
            className={`relative h-11 w-11 rounded-md border-2 bg-[#f2e3c4] font-semibold text-stone-800 transition-transform hover:-translate-y-0.5 ${MOD_STYLE[mod]}`}
          >
            <span className="text-lg leading-none">{letter === '?' ? '' : letter}</span>
            <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-stone-600 tnum">{value}</span>
            {MOD_LABEL[mod] && mod !== 'blank' && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-stone-900 px-1 text-[9px] font-bold uppercase tracking-wide text-sky-300">
                {MOD_LABEL[mod]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
