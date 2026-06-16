import { useCallback, useEffect, useState } from "react";

const KEY = "urban-dhage-recently-viewed";
const MAX = 10;

const load = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const save = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // ignore quota errors silently
  }
};

/**
 * Tracks recently-viewed product IDs, newest-first, capped at MAX.
 *
 * Cross-tab sync: a `storage` event listener updates state whenever another
 * tab writes to the same localStorage key, so all open tabs stay in sync.
 *
 * Usage:
 *   const { ids, record } = useRecentlyViewed();
 *   record(product.id);   // call on mount in ProductDetail
 */
export const useRecentlyViewed = () => {
  const [ids, setIds] = useState<string[]>(load);

  // ── Persist to localStorage on every state change ─────────────────────────
  useEffect(() => {
    save(ids);
  }, [ids]);

  // ── Cross-tab sync ────────────────────────────────────────────────────────
  // The `storage` event fires in every tab *except* the one that wrote the
  // value, so we only need to listen — our own writes are handled by the
  // effect above.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // Only react to changes on our specific key from another tab
      if (e.key !== KEY) return;
      // e.newValue is null when the key was deleted
      const updated = e.newValue ? (JSON.parse(e.newValue) as string[]) : [];
      setIds(updated);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── record ────────────────────────────────────────────────────────────────
  /** Add `id` to the front; remove duplicates; trim to MAX. */
  const record = useCallback((id: string) => {
    setIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX);
      // Write immediately so other tabs see this tab's view right away,
      // not just after the React render cycle completes.
      save(next);
      return next;
    });
  }, []);

  return { ids, record };
};
