import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  collection, getDocs, query, limit, startAfter,
  orderBy, QueryDocumentSnapshot, DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Search, X, SlidersHorizontal, ChevronDown, Check,
} from "lucide-react";

const PAGE_SIZE = 12;

const CATEGORY_ORDER = [
  "Sarees", "Kurtas", "Lehengas", "Dupattas",
  "Western", "Accessories", "Jewellery",
];

const SORT_OPTIONS = [
  { value: "default",    label: "Featured" },
  { value: "price-asc",  label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc",   label: "Name: A → Z" },
  { value: "name-desc",  label: "Name: Z → A" },
] as const;
type SortValue = typeof SORT_OPTIONS[number]["value"];

const PRICE_RANGES = [
  { label: "All prices",       min: 0,    max: Infinity },
  { label: "Under ₹500",       min: 0,    max: 500 },
  { label: "₹500 – ₹1,000",    min: 500,  max: 1000 },
  { label: "₹1,000 – ₹2,000",  min: 1000, max: 2000 },
  { label: "₹2,000 – ₹5,000",  min: 2000, max: 5000 },
  { label: "Above ₹5,000",     min: 5000, max: Infinity },
] as const;
type PriceRangeLabel = typeof PRICE_RANGES[number]["label"];

// ── helpers ───────────────────────────────────────────────────────────────────

const buildCategories = (items: Product[]) => {
  const unique = [...new Set(items.map((p) => p.category))];
  return [
    ...CATEGORY_ORDER.filter((c) => unique.includes(c)),
    ...unique.filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
};

const buildSizes = (items: Product[]) => {
  const ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
  const unique = [...new Set(items.flatMap((p) => p.sizes ?? []))];
  return [...ORDER.filter((s) => unique.includes(s)), ...unique.filter((s) => !ORDER.includes(s))];
};

const sortProducts = (items: Product[], sort: SortValue): Product[] => {
  const copy = [...items];
  switch (sort) {
    case "price-asc":  return copy.sort((a, b) => a.price - b.price);
    case "price-desc": return copy.sort((a, b) => b.price - a.price);
    case "name-asc":   return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":  return copy.sort((a, b) => b.name.localeCompare(a.name));
    default:           return copy;
  }
};

// ── subcomponents ─────────────────────────────────────────────────────────────

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

interface DropdownProps {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  active?: boolean;
}

const FilterDropdown = ({ label, open, onToggle, children, active }: DropdownProps) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-body text-sm transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:border-foreground/40"
      }`}
    >
      {label}
      <ChevronDown
        className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 top-full z-30 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ── main component ────────────────────────────────────────────────────────────

const ProductGrid = () => {
  // remote data
  const [products, setProducts]       = useState<Product[]>([]);
  const [categories, setCategories]   = useState<string[]>([]);
  const [allSizes, setAllSizes]       = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);

  // filters / search / sort
  const [searchQuery, setSearchQuery]       = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange]         = useState<PriceRangeLabel>("All prices");
  const [selectedSizes, setSelectedSizes]   = useState<string[]>([]);
  const [showInStock, setShowInStock]       = useState(false);
  const [sortBy, setSortBy]                 = useState<SortValue>("default");

  // dropdown open state (only one open at a time)
  const [openDropdown, setOpenDropdown] = useState<"price" | "size" | "sort" | null>(null);

  // refs
  const lastDocRef   = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const isFetching   = useRef(false);
  const hasMoreRef   = useRef(true);
  const observerRef  = useRef<IntersectionObserver | null>(null);
  const fetchMoreRef = useRef<() => Promise<void>>();
  const searchRef    = useRef<HTMLInputElement>(null);

  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-filter-root]")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // fetchMore
  const fetchMore = useCallback(async () => {
    if (isFetching.current || !hasMoreRef.current || !lastDocRef.current) return;
    isFetching.current = true;
    setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(collection(db, "products"), orderBy("name"), startAfter(lastDocRef.current), limit(PAGE_SIZE))
      );
      if (snap.docs.length === 0) { hasMoreRef.current = false; setHasMore(false); return; }
      const newItems = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
      lastDocRef.current = snap.docs[snap.docs.length - 1];
      const more = snap.docs.length >= PAGE_SIZE;
      hasMoreRef.current = more;
      setHasMore(more);
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...newItems.filter((p) => !ids.has(p.id))];
        setCategories(buildCategories(merged));
        setAllSizes(buildSizes(merged));
        return merged;
      });
    } catch (err) { console.error("fetchMore failed:", err); }
    finally { isFetching.current = false; setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchMoreRef.current = fetchMore; }, [fetchMore]);

  // initial fetch
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
      const more = snap.docs.length >= PAGE_SIZE;
      hasMoreRef.current = more;
      setProducts(items);
      setHasMore(more);
      setCategories(buildCategories(items));
      setAllSizes(buildSizes(items));
    } catch (err) { console.error("fetchInitial failed:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  // auto-fetch when category or search returns too few results
  useEffect(() => {
    if (!activeCategory || !hasMore || isFetching.current) return;
    const count = products.filter((p) => p.category === activeCategory).length;
    if (count < PAGE_SIZE) fetchMoreRef.current?.();
  }, [activeCategory, products, hasMore]);

  useEffect(() => {
    if (!searchQuery || !hasMore || isFetching.current) return;
    const q = searchQuery.toLowerCase();
    const count = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).length;
    if (count < PAGE_SIZE) fetchMoreRef.current?.();
  }, [searchQuery, products, hasMore]);

  // sentinel observer
  const attachObserver = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchMoreRef.current?.(); },
      { rootMargin: "0px 0px 800px 0px", threshold: 0 }
    );
    observerRef.current.observe(node);
  }, []);

  // scroll fallback
  useEffect(() => {
    const onScroll = () => {
      if (!hasMoreRef.current || isFetching.current) return;
      if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 800) {
        fetchMoreRef.current?.();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // external filter-category event (Hero / Navbar)
  useEffect(() => {
    const handler = (e: Event) => {
      const cat = (e as CustomEvent).detail as string;
      setActiveCategory(cat === "New Arrivals" ? null : cat);
      setSearchQuery("");
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("filter-category", handler);
    return () => window.removeEventListener("filter-category", handler);
  }, []);

  // external search-products event (Navbar search bar)
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent).detail as string;
      setSearchQuery(q);
      setActiveCategory(null);
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("search-products", handler);
    return () => window.removeEventListener("search-products", handler);
  }, []);

  // computed filtered + sorted list
  const filtered = useMemo(() => {
    const { min, max } = PRICE_RANGES.find((r) => r.label === priceRange)!;
    const q = searchQuery.toLowerCase();

    const result = products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q);
      const matchCategory = !activeCategory || p.category === activeCategory;
      const matchPrice    = p.price >= min && p.price <= max;
      const matchSize     = selectedSizes.length === 0 ||
        selectedSizes.some((s) => (p.sizes ?? []).includes(s));
      const matchStock    = !showInStock || (p.inStock && p.quantity > 0);
      return matchSearch && matchCategory && matchPrice && matchSize && matchStock;
    });

    return sortProducts(result, sortBy);
  }, [products, searchQuery, activeCategory, priceRange, selectedSizes, showInStock, sortBy]);

  const hasActiveFilters = !!(
    searchQuery || activeCategory ||
    priceRange !== "All prices" || selectedSizes.length ||
    showInStock || sortBy !== "default"
  );

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveCategory(null);
    setPriceRange("All prices");
    setSelectedSizes([]);
    setShowInStock(false);
    setSortBy("default");
  };

  // ── loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="mb-5 h-10 w-full animate-pulse rounded-full bg-muted" />
        <div className="mb-5 flex gap-2">
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

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Heading */}
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

      {/* ── Search bar ── */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search by name, category or description…"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory(null); }}
          className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-10 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Category pills ── */}
      {categories.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            variant={!activeCategory && !searchQuery ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveCategory(null); setSearchQuery(""); }}
            className="rounded-full font-body"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
              className="rounded-full font-body"
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* ── Filter + Sort bar ── */}
      <div
        data-filter-root=""
        className="mb-5 flex flex-wrap items-center gap-2"
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />

        {/* Price range */}
        <FilterDropdown
          label={priceRange === "All prices" ? "Price" : priceRange}
          open={openDropdown === "price"}
          onToggle={() => setOpenDropdown((o) => o === "price" ? null : "price")}
          active={priceRange !== "All prices"}
        >
          <div className="py-1.5">
            {PRICE_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => { setPriceRange(r.label); setOpenDropdown(null); }}
                className="flex w-full items-center gap-2 px-4 py-2 font-body text-sm text-foreground hover:bg-muted"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {priceRange === r.label && <Check className="h-3.5 w-3.5 text-primary" />}
                </span>
                {r.label}
              </button>
            ))}
          </div>
        </FilterDropdown>

        {/* Size */}
        {allSizes.length > 0 && (
          <FilterDropdown
            label={
              selectedSizes.length === 0
                ? "Size"
                : `Size: ${selectedSizes.join(", ")}`
            }
            open={openDropdown === "size"}
            onToggle={() => setOpenDropdown((o) => o === "size" ? null : "size")}
            active={selectedSizes.length > 0}
          >
            <div className="flex flex-wrap gap-2 p-3">
              {allSizes.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setSelectedSizes((prev) =>
                      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                    )
                  }
                  className={`rounded border px-2.5 py-1 font-body text-xs font-medium transition-colors ${
                    selectedSizes.includes(s)
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </FilterDropdown>
        )}

        {/* Availability toggle */}
        <button
          onClick={() => setShowInStock((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-body text-sm transition-colors ${
            showInStock
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-foreground hover:border-foreground/40"
          }`}
        >
          {showInStock && <Check className="h-3.5 w-3.5" />}
          In Stock
        </button>

        {/* Sort */}
        <FilterDropdown
          label={
            sortBy === "default"
              ? "Sort"
              : SORT_OPTIONS.find((o) => o.value === sortBy)!.label
          }
          open={openDropdown === "sort"}
          onToggle={() => setOpenDropdown((o) => o === "sort" ? null : "sort")}
          active={sortBy !== "default"}
        >
          <div className="py-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSortBy(opt.value); setOpenDropdown(null); }}
                className="flex w-full items-center gap-2 px-4 py-2 font-body text-sm text-foreground hover:bg-muted"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {sortBy === opt.value && <Check className="h-3.5 w-3.5 text-primary" />}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </FilterDropdown>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="ml-auto flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="mb-4 font-body text-sm text-muted-foreground">
        {searchQuery
          ? `${filtered.length}${hasMore && filtered.length >= PAGE_SIZE ? "+" : ""} results for "${searchQuery}"`
          : activeCategory
          ? `${filtered.length}${hasMore ? "+" : ""} ${filtered.length === 1 ? "product" : "products"} in ${activeCategory}`
          : `${products.length}${hasMore ? "+" : ""} products`}
      </p>

      {/* Empty filtered state */}
      {filtered.length === 0 && !loadingMore ? (
        <div className="py-20 text-center">
          <p className="font-heading text-lg font-semibold">No products found</p>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
          <Button className="mt-4 rounded-full" onClick={clearAllFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <motion.div
            key={`${activeCategory}-${searchQuery}-${sortBy}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
            {loadingMore &&
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
          </motion.div>

          {hasMore && (
            <div ref={attachObserver} className="h-4 w-full" aria-hidden="true" />
          )}

          {loadingMore && (
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

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
