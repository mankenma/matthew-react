import type { Card } from '../../engine/cards';
import { PlayingCard, CardSlot } from '../cards/PlayingCard';

interface Props {
  label: 'Player' | 'Banker';
  cards: Card[];
  total: number | null;
  isPair?: boolean;
  isWinner?: boolean;
  glow?: boolean; // pulsing brass flourish on the settled winning hand
  faceDown?: boolean;
  revealCount?: number; // how many cards are face-up; defaults to all
  squeezeIndex?: number; // index of the card the player can tap to squeeze
  onSqueeze?: () => void;
  dealStagger?: number; // ms between dealt cards
  flipMs?: number; // flip duration for the squeeze reveal
}

export function Hand({
  label,
  cards,
  total,
  isPair,
  isWinner,
  glow,
  faceDown = false,
  revealCount,
  squeezeIndex,
  onSqueeze,
  dealStagger = 120,
  flipMs = 420,
}: Props) {
  const accent = label === 'Player' ? 'text-player-blue' : 'text-banker-red';
  const ring = label === 'Player' ? 'ring-player-blue/60' : 'ring-banker-red/60';
  const shown = revealCount ?? cards.length;

  return (
    <div
      className={`relative flex flex-col items-center gap-3 rounded-2xl px-5 py-4 transition-all duration-300 ${
        glow ? 'animate-winnerGlow bg-brass/[0.06]' : isWinner ? `ring-2 ${ring} bg-white/[0.03]` : 'ring-1 ring-white/5'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`font-display text-lg font-bold tracking-wide ${accent}`}>{label}</span>
        {isPair && (
          <span className="rounded-full border border-brass/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider brass-text animate-popIn">
            Pair
          </span>
        )}
      </div>

      <div className="flex min-h-[112px] items-center gap-2">
        {cards.length === 0 ? (
          <>
            <CardSlot size={66} />
            <CardSlot size={66} />
          </>
        ) : (
          cards.map((c, i) => {
            const isSqueezable = i === squeezeIndex;
            return (
              <PlayingCard
                key={i}
                card={c}
                size={66}
                faceDown={faceDown || i >= shown}
                dealDelay={i * dealStagger}
                flipMs={isSqueezable ? flipMs : 420}
                squeezable={isSqueezable}
                onClick={isSqueezable ? onSqueeze : undefined}
              />
            );
          })
        )}
      </div>

      <div
        className={`tnum flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
          glow ? 'animate-countPop' : ''
        } ${
          total == null ? 'text-white/30' : isWinner ? 'bg-brass text-charcoal' : 'bg-black/40 text-bone'
        }`}
      >
        {total == null ? '–' : total}
      </div>
    </div>
  );
}
