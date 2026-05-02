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

// ── Skeleton card ─────────────────────────────────────────────────────────────
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

// ── Inline loader shown at the bottom while fetching next page ────────────────
const InlineLoader = () => (
  <div className="col-span-2 flex flex-col items-center justify-center gap-3 py-10 sm:col-span-2 lg:col-span-3 xl:col-span-4">
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
    <p className="font-body text-sm text-muted-foreground">Loading more products…</p>
  </div>
);

// ── ProductGrid ───────────────────────────────────────────────────────────────
const ProductGrid = () => {
  const [products, setProducts]       = useState<Product[]>([]);
  const [categories, setCategories]   = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [lastDoc, setLastDoc]         = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Sentinel div at the bottom of the grid — IntersectionObserver watches this
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

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
      setProducts(items);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setCategories(buildCategories(items));
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load next page ─────────────────────────────────────────────────────────
  const fetchMore = useCallback(async () => {
    if (!lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "products"),
          orderBy("name"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        )
      );
      const newItems = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
      setProducts((prev) => {
        const merged = [...prev, ...newItems];
        setCategories(buildCategories(merged));
        return merged;
      });
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMore]);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  // ── IntersectionObserver — fires fetchMore when sentinel enters viewport ───
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the sentinel div (invisible, at bottom of grid) becomes visible,
        // and we're not already loading, trigger the next page fetch.
        if (entry.isIntersecting && !loadingMore && hasMore && !loading) {
          fetchMore();
        }
      },
      {
        rootMargin: "300px", // start loading 300px before the sentinel is visible
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore, loadingMore, hasMore, loading]);

  // ── Category filter event from Navbar/Footer ───────────────────────────────
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

  // ── Empty catalogue ────────────────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Our Collection</h2>
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
        {filtered.length}{hasMore && !activeCategory ? "+" : ""}{" "}
        {filtered.length === 1 ? "product" : "products"}
        {activeCategory ? ` in ${activeCategory}` : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-heading text-lg font-semibold text-foreground">No products in this category yet</p>
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
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))}

            {/* Inline loading skeletons — appear inside the grid seamlessly */}
            {loadingMore && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}
          </motion.div>

          {/* Sentinel — invisible div that IntersectionObserver watches.
              When this enters the viewport, the next page fetch is triggered. */}
          {!activeCategory && hasMore && (
            <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
          )}

          {/* End of catalogue */}
          {!activeCategory && !hasMore && products.length > PAGE_SIZE && (
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
