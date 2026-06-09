import { useCallback, useEffect, useState } from 'react';

// localStorage-backed state with a safe fallback when storage is unavailable.
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        const stored = JSON.parse(raw) as T;
        // Backfill keys added since this value was last persisted.
        if (isPlainObject(stored) && isPlainObject(initial)) {
          return { ...(initial as object), ...(stored as object) } as T;
        }
        return stored;
      }
    } catch {
      /* ignore */
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue, reset];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
