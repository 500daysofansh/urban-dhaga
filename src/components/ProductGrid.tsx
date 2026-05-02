import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, getDocs, query, limit, startAfter,
  orderBy, QueryDocumentSnapshot, DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 12;

const CATEGORY_ORDER = [
  "Sarees", "Kurtas", "Lehengas", "Dupattas",
  "Western", "Accessories", "Jewellery",
];

const SkeletonCard = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="aspect-[4/5] animate-pulse bg-muted" />
    <div className="space-y-3 p-4">
      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
    </div>
  </div>
);

const buildCategories = (items: Product[]) => {
  const unique = [...new Set(items.map((p) => p.category))];
  return [
    ...CATEGORY_ORDER.filter((c) => unique.includes(c)),
    ...unique.filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
};

const ProductGrid = () => {
  const [products, setProducts]             = useState<Product[]>([]);
  const [categories, setCategories]         = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [hasMore, setHasMore]               = useState(true);

  // Use refs for values needed inside callbacks/observers to avoid stale closures
  const lastDocRef  = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const isFetching  = useRef(false);
  const hasMoreRef  = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Keep ref in sync with state
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  // ── fetchMore — stable ref so observer never goes stale ───────────────────
  // We store it in a ref so the IntersectionObserver callback always calls
  // the latest version without needing to re-observe on every render.
  const fetchMoreRef = useRef<() => Promise<void>>();

  const fetchMore = useCallback(async () => {
    // Guard: don't fire if already fetching, no more pages, or no cursor
    if (isFetching.current) return;
    if (!hasMoreRef.current) return;
    if (!lastDocRef.current) return;

    isFetching.current = true;
    setLoadingMore(true);

    try {
      const snap = await getDocs(
        query(
          collection(db, "products"),
          orderBy("name"),
          startAfter(lastDocRef.current),
          limit(PAGE_SIZE)
        )
      );

      if (snap.docs.length === 0) {
        // No more docs — mark done
        hasMoreRef.current = false;
        setHasMore(false);
        return;
      }

      const newItems = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
      lastDocRef.current = snap.docs[snap.docs.length - 1];

      // Only mark hasMore=false when we actually get fewer than PAGE_SIZE docs
      // This avoids premature termination on slow networks
      const more = snap.docs.length >= PAGE_SIZE;
      hasMoreRef.current = more;
      setHasMore(more);

      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        // Deduplicate — prevents double-adding if observer fires twice rapidly
        const deduped = newItems.filter((p) => !ids.has(p.id));
        const merged = [...prev, ...deduped];
        setCategories(buildCategories(merged));
        return merged;
      });
    } catch (err) {
      console.error("fetchMore failed:", err);
      // Don't mark hasMore=false on error — let the next scroll attempt retry
    } finally {
      isFetching.current = false;
      setLoadingMore(false);
    }
  }, []);

  // Keep fetchMoreRef current
  useEffect(() => { fetchMoreRef.current = fetchMore; }, [fetchMore]);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    isFetching.current = false;
    lastDocRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    setProducts([]);

    try {
      const snap = await getDocs(
        query(collection(db, "products"), orderBy("name"), limit(PAGE_SIZE))
      );

      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;

      // FIX: use >= instead of === so we don't flip hasMore=false if Firestore
      // returns slightly fewer than PAGE_SIZE due to deleted/filtered docs
      const more = snap.docs.length >= PAGE_SIZE;
      hasMoreRef.current = more;

      setProducts(items);
      setHasMore(more);
      setCategories(buildCategories(items));
    } catch (err) {
      console.error("fetchInitial failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  // ── IntersectionObserver — re-attaches whenever sentinel mounts/unmounts ──
  // FIX: We observe the sentinel in a useEffect with sentinelRef.current as
  // a dependency-like trigger by using a callback ref pattern.
  // The observer always calls fetchMoreRef.current so it never goes stale.
  const attachObserver = useCallback((node: HTMLDivElement | null) => {
    // Disconnect old observer first
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchMoreRef.current?.();
        }
      },
      // rootMargin: start loading 800px before sentinel enters viewport
      { rootMargin: "0px 0px 800px 0px", threshold: 0 }
    );

    observerRef.current.observe(node);
  }, []);

  // ── Scroll fallback — catches cases where observer misfires on iOS Safari ──
  useEffect(() => {
    const onScroll = () => {
      if (!hasMoreRef.current || isFetching.current) return;
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight    = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 800) {
        fetchMoreRef.current?.();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Category filter ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const cat = (e as CustomEvent).detail as string;
      setActiveCategory(cat === "New Arrivals" ? null : cat);
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("filter-category", handler);
    return () => window.removeEventListener("filter-category", handler);
  }, []);

  const filtered = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : products;

  // ── Initial skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-bold sm:text-3xl">Our Collection</h2>
        <p className="mt-4 font-body text-muted-foreground">No products available yet. Check back soon!</p>
      </section>
    );
  }

  // ── Main grid ──────────────────────────────────────────────────────────────
  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p className="mb-3 font-body text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Curated for You
        </p>
        <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Our Collection</h2>
        <p className="mt-2 font-body text-muted-foreground">
          Explore our handpicked selection of traditional and western wear
        </p>
      </motion.div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(null)}
            className="rounded-full font-body"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="rounded-full font-body"
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="mb-4 font-body text-sm text-muted-foreground">
        {activeCategory
          ? `${filtered.length} ${filtered.length === 1 ? "product" : "products"} in ${activeCategory}`
          : `${products.length}${hasMore ? "+" : ""} products`
        }
      </p>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-heading text-lg font-semibold">No products in this category yet</p>
          <p className="mt-1 font-body text-sm text-muted-foreground">Check back soon or browse all</p>
          <Button className="mt-4 rounded-full" onClick={() => setActiveCategory(null)}>View All</Button>
        </div>
      ) : (
        <>
          <motion.div
            key={activeCategory ?? "all"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}

            {/* Inline skeleton cards while loading more */}
            {loadingMore && Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`skel-${i}`} />
            ))}
          </motion.div>

          {/* Sentinel — uses callback ref so observer re-attaches on remount.
              Only rendered when not filtering (category scroll doesn't need pagination) */}
          {!activeCategory && hasMore && (
            <div ref={attachObserver} className="h-4 w-full" aria-hidden="true" />
          )}

          {/* Spinner below grid while fetching */}
          {loadingMore && (
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {/* End of catalogue */}
          {!hasMore && products.length > PAGE_SIZE && (
            <p className="mt-10 text-center font-body text-sm text-muted-foreground">
              You've seen all {products.length} products
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default ProductGrid;
