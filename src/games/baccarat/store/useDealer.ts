import { useCallback, useRef, useState } from 'react';
import { type Shoe, createShoe } from '../engine/shoe';
import { type HandResolution, resolveHand } from '../engine/rules';
import { systemRng } from '../engine/rng';

export interface ShoeStatus {
  remaining: number;
  cutReached: boolean;
  reshuffled: boolean;
}

// Manages a single shoe with realistic cut-card behavior:
// when the cut card surfaces, finish the current hand, play exactly one more, then reshuffle.
export function useDealer() {
  const shoeRef = useRef<Shoe | null>(null);
  const cutReachedRef = useRef(false);
  const extraPlayedRef = useRef(0);
  const pendingReshuffleRef = useRef(false);

  const [status, setStatus] = useState<ShoeStatus>({ remaining: 416, cutReached: false, reshuffled: false });

  const ensureShoe = (): Shoe => {
    if (!shoeRef.current) shoeRef.current = createShoe(systemRng);
    return shoeRef.current;
  };

  const reshuffle = useCallback(() => {
    shoeRef.current = createShoe(systemRng);
    cutReachedRef.current = false;
    extraPlayedRef.current = 0;
    pendingReshuffleRef.current = false;
    const s = shoeRef.current;
    setStatus({ remaining: s.remaining(), cutReached: false, reshuffled: true });
  }, []);

  const deal = useCallback((): HandResolution => {
    let reshuffled = false;
    if (pendingReshuffleRef.current || !shoeRef.current) {
      shoeRef.current = createShoe(systemRng);
      cutReachedRef.current = false;
      extraPlayedRef.current = 0;
      pendingReshuffleRef.current = false;
      reshuffled = true;
    }
    const shoe = ensureShoe();
    const result = resolveHand(shoe);

    if (shoe.cutCardReached()) {
      if (!cutReachedRef.current) {
        cutReachedRef.current = true; // surfacing hand
      } else {
        extraPlayedRef.current += 1;
        if (extraPlayedRef.current >= 1) pendingReshuffleRef.current = true;
      }
    }

    setStatus({ remaining: shoe.remaining(), cutReached: cutReachedRef.current, reshuffled });
    return result;
  }, []);

  return { deal, reshuffle, status, burn: () => ensureShoe().lastBurn() };
}
