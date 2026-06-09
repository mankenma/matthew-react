import { useRef, useState } from 'react';
import { type Card, type Rank, type Suit, isRed } from '../../engine/cards';

const SUIT_GLYPH: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

// Pip layouts in normalized card coordinates (x,y in 0..1 of the face area).
// Pips in the lower half are flipped vertically, as on a real card.
const X = { L: 0.32, C: 0.5, R: 0.68 } as const;
type Col = keyof typeof X;
type Pip = [Col, number];

const LAYOUTS: Partial<Record<Rank, Pip[]>> = {
  A: [['C', 0.5]],
  '2': [['C', 0.24], ['C', 0.76]],
  '3': [['C', 0.24], ['C', 0.5], ['C', 0.76]],
  '4': [['L', 0.24], ['R', 0.24], ['L', 0.76], ['R', 0.76]],
  '5': [['L', 0.24], ['R', 0.24], ['C', 0.5], ['L', 0.76], ['R', 0.76]],
  '6': [['L', 0.24], ['R', 0.24], ['L', 0.5], ['R', 0.5], ['L', 0.76], ['R', 0.76]],
  '7': [['L', 0.24], ['R', 0.24], ['C', 0.37], ['L', 0.5], ['R', 0.5], ['L', 0.76], ['R', 0.76]],
  '8': [['L', 0.24], ['R', 0.24], ['C', 0.37], ['L', 0.5], ['R', 0.5], ['C', 0.63], ['L', 0.76], ['R', 0.76]],
  '9': [['L', 0.22], ['R', 0.22], ['L', 0.41], ['R', 0.41], ['C', 0.5], ['L', 0.59], ['R', 0.59], ['L', 0.78], ['R', 0.78]],
  '10': [['L', 0.2], ['R', 0.2], ['C', 0.33], ['L', 0.39], ['R', 0.39], ['L', 0.61], ['R', 0.61], ['C', 0.67], ['L', 0.8], ['R', 0.8]],
};

const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];
const W = 100;
const H = 140;

function FaceSVG({ card, size, hideIndices = false }: { card: Card; size: number; hideIndices?: boolean }) {
  const height = size * (H / W);
  const color = isRed(card.suit) ? '#b3262b' : '#1a1a1a';
  const glyph = SUIT_GLYPH[card.suit];
  const isFace = FACE_RANKS.includes(card.rank);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cardFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf8ef" />
          <stop offset="1" stopColor="#efe9d8" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width={W - 3} height={H - 3} rx="9" fill="url(#cardFace)" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      {/* The printed corner indices are what a squeezing player covers with their
          thumbs — hide them so the value can only be read by counting pips. */}
      {!hideIndices && (
        <g fill={color} fontFamily="Inter, sans-serif" fontWeight={700}>
          <text x="9" y="20" fontSize="16" textAnchor="start">{card.rank}</text>
          <text x="9" y="34" fontSize="14" textAnchor="start">{glyph}</text>
          <g transform={`rotate(180 ${W - 9} ${H - 12})`}>
            <text x={W - 9} y={H - 24} fontSize="16" textAnchor="start">{card.rank}</text>
            <text x={W - 9} y={H - 10} fontSize="14" textAnchor="start">{glyph}</text>
          </g>
        </g>
      )}
      {isFace ? (
        <g>
          <rect x="22" y="34" width={W - 44} height={H - 68} rx="5" fill="none" stroke="rgba(201,162,75,0.55)" strokeWidth="1.4" />
          <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize="40" fontFamily="Playfair Display, serif" fontWeight={700} fill={color}>{card.rank}</text>
          <text x={W / 2} y={H / 2 + 30} textAnchor="middle" fontSize="20" fill={color}>{glyph}</text>
        </g>
      ) : (
        <g fill={color}>
          {(LAYOUTS[card.rank] ?? []).map(([col, yf], i) => {
            const cx = X[col] * W;
            const cy = yf * H;
            const flip = yf > 0.5;
            const fs = card.rank === 'A' ? 34 : 18;
            return (
              <text key={i} x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={fs} transform={flip ? `rotate(180 ${cx} ${cy})` : undefined}>
                {glyph}
              </text>
            );
          })}
        </g>
      )}
    </svg>
  );
}

function BackSVG({ size, glow }: { size: number; glow?: boolean }) {
  const height = size * (H / W);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cardBack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#15402f" />
          <stop offset="1" stopColor="#0a1f17" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width={W - 3} height={H - 3} rx="9" fill="url(#cardBack)" stroke="#C9A24B" strokeWidth={glow ? 2.4 : 1.5} />
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="6" fill="none" stroke="rgba(201,162,75,0.55)" strokeWidth="1" />
      <text x={W / 2} y={H / 2 + 10} textAnchor="middle" fontSize="30" fill="rgba(201,162,75,0.7)" fontFamily="Playfair Display, serif">✦</text>
    </svg>
  );
}

// A draggable squeeze: the player peels the printed back off the face, revealing
// the suit pips one edge at a time. The corner indices stay hidden (FaceSVG
// `hideIndices`) so the value can only be read by counting pips — the whole point
// of the ritual. Dragging right grows `progress` (0 covered → 1 open); releasing
// past the threshold completes the reveal, below it springs back.
function SqueezeCard({ card, size, onComplete }: { card: Card; size: number; onComplete?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [animating, setAnimating] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startProg = useRef(0);
  const moved = useRef(0);
  const done = useRef(false);
  const THRESH = 0.58;

  function finish() {
    if (done.current) return;
    done.current = true;
    setAnimating(true);
    setProgress(1);
    // Hold the fully-open face for a beat so the player can read it, then advance.
    setTimeout(() => onComplete?.(), 260);
  }

  function onDown(e: React.PointerEvent) {
    if (done.current) return;
    dragging.current = true;
    setAnimating(false);
    startX.current = e.clientX;
    startProg.current = progress;
    moved.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    moved.current = Math.max(moved.current, Math.abs(dx));
    const p = Math.min(1, Math.max(0, startProg.current + dx / size));
    setProgress(p);
  }
  function onUp(e: React.PointerEvent) {
    if (!dragging.current) return;
    dragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setAnimating(true);
    if (moved.current < 6) {
      // A tap, not a drag: squeezing is optional, so a click reveals at once.
      finish();
      return;
    }
    if (progress >= THRESH) finish();
    else setProgress(0);
  }

  const seam = progress * size; // x of the peel edge, in px
  const transition = animating ? 'clip-path 260ms cubic-bezier(0.2,0.8,0.2,1), transform 260ms cubic-bezier(0.2,0.8,0.2,1)' : 'none';

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        perspective: 800,
      }}
    >
      {/* The card face beneath — full face (rank + pips) so the value is legible
          as it peels, not only after the squeeze finishes. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <FaceSVG card={card} size={size} />
      </div>

      {/* A soft shadow the lifted cover casts onto the just-revealed face. */}
      {progress > 0.01 && progress < 0.999 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: Math.max(0, seam - 14),
            width: 16,
            transition,
            background: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* The printed back, anchored at the right edge, bending up as it peels. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '100% 50%',
          transform: `rotateY(${-16 * progress}deg)`,
          clipPath: `inset(0 0 0 ${progress * 100}%)`,
          WebkitClipPath: `inset(0 0 0 ${progress * 100}%)`,
          transition,
          boxShadow: progress > 0.01 ? '-8px 0 14px rgba(0,0,0,0.35)' : 'none',
          pointerEvents: 'none',
        }}
      >
        <BackSVG size={size} glow />
      </div>

      {/* A bright curl highlight running down the peel edge. */}
      {progress > 0.01 && progress < 0.999 && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            bottom: 2,
            left: seam - 1.5,
            width: 3,
            transition,
            borderRadius: 2,
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(201,162,75,0.9) 50%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

interface Props {
  card: Card;
  faceDown?: boolean;
  size?: number; // width in px; height derived at 2.5:3.5
  dealDelay?: number; // ms, for staggered deal-in
  flipMs?: number; // flip duration; longer = slower squeeze
  squeezable?: boolean; // active card: drag to peel & reveal pips
  onClick?: () => void;
  className?: string;
}

export function PlayingCard({ card, faceDown = false, size = 76, dealDelay = 0, flipMs = 420, squeezable = false, onClick, className = '' }: Props) {
  const height = size * (H / W);

  // The active squeeze card swaps the instant flip for an interactive peel.
  if (squeezable && faceDown) {
    return (
      <div className={`animate-dealIn ${className}`} style={{ width: size, height, animationDelay: `${dealDelay}ms` }}>
        <div style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' }}>
          <SqueezeCard card={card} size={size} onComplete={onClick} />
        </div>
      </div>
    );
  }

  return (
    // Layer 1: deal-in entrance. Only handles the slide-in transform + delay.
    <div className={`animate-dealIn ${className}`} style={{ width: size, height, animationDelay: `${dealDelay}ms` }}>
      {/* Layer 2: perspective + squeeze pulse + shadow + click target.
          The pulse animation lives here so it never overwrites the flip rotation,
          and the shadow filter lives here so it never flattens the 3D context. */}
      <div
        className={squeezable ? 'animate-squeezeHint' : ''}
        onClick={onClick}
        style={{
          width: '100%',
          height: '100%',
          perspective: 700,
          cursor: onClick ? 'pointer' : 'default',
          filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))',
        }}
      >
        {/* Layer 3: the two-sided flip. Owns ONLY the rotateY transform. */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: `transform ${flipMs}ms cubic-bezier(0.2,0.8,0.2,1)`,
            transform: faceDown ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <FaceSVG card={card} size={size} />
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <BackSVG size={size} glow={squeezable} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardSlot({ size = 76 }: { size?: number }) {
  const height = size * (H / W);
  return <div style={{ width: size, height }} className="rounded-[9px] border border-dashed border-brass/25 bg-black/10" />;
}
