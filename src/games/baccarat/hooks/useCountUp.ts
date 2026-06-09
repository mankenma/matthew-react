import { useEffect, useRef, useState } from 'react';

// Tween a number toward `target` over `durationMs` using requestAnimationFrame.
// When `active` is false the value snaps straight to the target (no animation),
// which keeps non-event renders cheap. Used for payout/bankroll count-ups.
export function useCountUp(target: number, durationMs = 600, active = true): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(from + (target - from) * ease(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs, active]);

  return value;
}
