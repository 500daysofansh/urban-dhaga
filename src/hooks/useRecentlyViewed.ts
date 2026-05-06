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

/**
 * Tracks recently-viewed product IDs, newest-first, capped at MAX.
 *
 * Usage:
 *   const { ids, record } = useRecentlyViewed();
 *   record(product.id);          // call on mount in ProductDetail
 */
export const useRecentlyViewed = () => {
  const [ids, setIds] = useState<string[]>(load);

  // Sync state → localStorage whenever ids changes
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      // ignore quota errors
    }
  }, [ids]);

  /** Add `id` to the front; remove duplicates; trim to MAX. */
  const record = useCallback((id: string) => {
    setIds((prev) => {
      const deduped = prev.filter((x) => x !== id);
      return [id, ...deduped].slice(0, MAX);
    });
  }, []);

  return { ids, record };
};
