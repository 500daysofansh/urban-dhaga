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

const ProductGrid = () => {
  const [products, setProducts]             = useState<Product[]>([]);
  const [categories, setCategories]         = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [hasMore, setHasMore]               = useState(true);

  // Keep lastDoc in a ref so fetchMore always reads the latest value
  // without needing to be in the dependency array (avoids stale closures)
  const lastDocRef  = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const isFetching  = useRef(false); // prevents double-firing
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildCategories = (items: Product[]) => {
    const unique = [...new Set(items.map((p) => p.category))];
    return [
      ...CATEGORY_ORDER.filter((c) => unique.includes(c)),
      ...unique.filter((c) => !CATEGORY_ORDER.includes(c)),
    ];
  };

  // ── Initial fetch ──────────────────────────────────────────────────────────
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "products"), orderBy("name"), limit(PAGE_SIZE))
      );
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setProducts(items);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setCategories(buildCategories(items));
    } catch (err) {
      console.error("fetchInitial failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load next page ─────────────────────────────────────────────────────────
  // Uses refs instead of state for guard checks — no stale closure issues
  const fetchMore = useCallback(async () => {
    if (isFetching.current || !lastDocRef.current) return;
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
      const newItems = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];

      // Update lastDoc ref BEFORE setState so next observer fire is correct
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      const noMore = snap.docs.length < PAGE_SIZE;

      setProducts((prev) => {
        const merged = [...prev, ...newItems];
        setCategories(buildCategories(merged));
        return merged;
      });
      setHasMore(!noMore);
    } catch (err) {
      console.error("fetchMore failed:", err);
    } finally {
      isFetching.current = false;
      setLoadingMore(false);
    }
  }, []); // no deps — reads everything from refs

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  // ── IntersectionObserver ───────────────────────────────────────────────────
  // Re-attaches whenever hasMore or loading changes so it stops when done
  useEffect(() => {
    if (!hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchMore();
      },
      { rootMargin: "400px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchMore]);

  // ── Category filter event ──────────────────────────────────────────────────
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

  // ── Skeleton ───────────────────────────────────────────────────────────────
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

  // ── Main ───────────────────────────────────────────────────────────────────
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

      <p className="mb-4 font-body text-sm text-muted-foreground">
        {filtered.length}{hasMore && !activeCategory ? "+" : ""}{" "}
        {filtered.length === 1 ? "product" : "products"}
        {activeCategory ? ` in ${activeCategory}` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-heading text-lg font-semibold">No products in this category yet</p>
          <p className="mt-1 font-body text-sm text-muted-foreground">Check back soon or browse all products</p>
          <Button className="mt-4 rounded-full" onClick={() => setActiveCategory(null)}>View All</Button>
        </div>
      ) : (
        <>
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}

            {/* Skeleton cards appear inline while next page loads */}
            {loadingMore && Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`skel-${i}`} />
            ))}
          </motion.div>

          {/* Sentinel — IntersectionObserver target, invisible */}
          {!activeCategory && hasMore && (
            <div ref={sentinelRef} className="h-2 w-full" aria-hidden="true" />
          )}

          {/* Spinner below grid while fetching (backup visual) */}
          {loadingMore && (
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!activeCategory && !hasMore && products.length > PAGE_SIZE && (
            <p className="mt-10 text-center font-body text-sm text-muted-foreground">
              You've seen all {products.length} products ✨
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default ProductGrid;
