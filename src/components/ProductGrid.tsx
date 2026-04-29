import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 12; // Load 12 at a time — manageable for mobile networks

const CATEGORY_ORDER = [
  "Sarees", "Kurtas", "Lehengas", "Dupattas",
  "Western", "Accessories", "Jewellery",
];

const SkeletonCard = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div className="aspect-[4/5] animate-pulse bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
    </div>
  </div>
);

const ProductGrid = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Initial load — first page only
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "products"),
        orderBy("name"),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      setProducts(items);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      // Build category list from what we have — more may come on "load more"
      // but this gives the filter pills something to show immediately
      const uniqueCats = [...new Set(items.map((p) => p.category))];
      const sorted = [
        ...CATEGORY_ORDER.filter((c) => uniqueCats.includes(c)),
        ...uniqueCats.filter((c) => !CATEGORY_ORDER.includes(c)),
      ];
      setCategories(sorted);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load next page
  const fetchMore = useCallback(async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "products"),
        orderBy("name"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(q);
      const newItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      setProducts((prev) => {
        const merged = [...prev, ...newItems];

        // Update category list with any new categories in the new batch
        const uniqueCats = [...new Set(merged.map((p) => p.category))];
        const sorted = [
          ...CATEGORY_ORDER.filter((c) => uniqueCats.includes(c)),
          ...uniqueCats.filter((c) => !CATEGORY_ORDER.includes(c)),
        ];
        setCategories(sorted);

        return merged;
      });
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Listen for category filter events from Navbar/Footer
  useEffect(() => {
    const handleFilterCategory = (e: Event) => {
      const category = (e as CustomEvent).detail as string;
      setActiveCategory(category === "New Arrivals" ? null : category);
      const el = document.getElementById("products");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("filter-category", handleFilterCategory);
    return () => window.removeEventListener("filter-category", handleFilterCategory);
  }, []);

  const filtered = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : products;

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-4 w-32 animate-pulse rounded bg-muted mb-3" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-foreground font-heading sm:text-3xl">Our Collection</h2>
        <p className="mt-4 text-muted-foreground font-body">No products available yet. Check back soon!</p>
      </section>
    );
  }

  // ── Main grid ─────────────────────────────────────────────────────
  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary font-body mb-3">
          Curated for You
        </p>
        <h2 className="text-3xl font-bold text-foreground font-heading sm:text-4xl">Our Collection</h2>
        <p className="mt-2 text-muted-foreground font-body">
          Explore our handpicked selection of traditional and western wear
        </p>
      </motion.div>

      {/* Category filter pills */}
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

      {/* Product count */}
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
          <Button className="mt-4 rounded-full" onClick={() => setActiveCategory(null)}>
            View All
          </Button>
        </div>
      ) : (
        <>
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))}
          </motion.div>

          {/* Load more — only show when not filtered and more pages exist */}
          {!activeCategory && hasMore && (
            <div className="mt-12 flex justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={fetchMore}
                disabled={loadingMore}
                className="rounded-full font-body px-8"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}

          {/* End of catalogue message */}
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
