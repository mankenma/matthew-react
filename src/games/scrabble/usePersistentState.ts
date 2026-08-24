import { useEffect, useState } from 'react';

// localStorage-backed state that degrades to plain state when storage is
// unavailable (private mode, SSR hydration, storage disabled).
export function usePersistentState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        const stored = JSON.parse(raw) as T;
        // Backfill any keys added since this value was last persisted.
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

  return [value, setValue];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
