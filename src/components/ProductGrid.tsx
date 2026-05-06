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
  { value: "default", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
] as const;

type SortValue = typeof SORT_OPTIONS[number]["value"];

const PRICE_RANGES = [
  { label: "All prices", min: 0, max: Infinity },
  { label: "Under 500", min: 0, max: 500 },
  { label: "500 to 1000", min: 500, max: 1000 },
  { label: "1000 to 2000", min: 1000, max: 2000 },
  { label: "2000 to 5000", min: 2000, max: 5000 },
  { label: "Above 5000", min: 5000, max: Infinity },
] as const;

type PriceRangeLabel = typeof PRICE_RANGES[number]["label"];

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

const SkeletonCard = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="aspect-[4/5] animate-pulse bg-muted" />
    <div className="space-y-3 p-3 sm:p-4">
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
  alignRight?: boolean;
}

const FilterDropdown = ({ label, open, onToggle, children, active, alignRight }: DropdownProps) => (
  <div className="relative" data-filter-dropdown="">
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-body text-xs sm:text-sm transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:border-foreground/40"
      }`}
    >
      <span className="max-w-[80px] truncate sm:max-w-none">{label}</span>
      <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className={`absolute top-full z-30 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-border bg-popover shadow-lg ${
            alignRight ? "right-0" : "left-0"
          }`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Mobile filter bottom sheet
interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  priceRange: PriceRangeLabel;
  setPriceRange: (v: PriceRangeLabel) => void;
  allSizes: string[];
  selectedSizes: string[];
  setSelectedSizes: (v: string[]) => void;
  showInStock: boolean;
  setShowInStock: (v: boolean) => void;
  sortBy: SortValue;
  setSortBy: (v: SortValue) => void;
  activeFilterCount: number;
  onClear: () => void;
}

const FilterSheet = ({
  open, onClose, priceRange, setPriceRange,
  allSizes, selectedSizes, setSelectedSizes,
  showInStock, setShowInStock, sortBy, setSortBy,
  activeFilterCount, onClear,
}: FilterSheetProps) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
        {/*
          FIX: sheet is flex-col with fixed max-height.
          - Header and footer are shrink-0 (never scroll away).
          - Only the filter options area is scrollable (flex-1 overflow-y-auto).
          - Footer sits OUTSIDE the scroll area so "Show results" is always visible.
          - pb-16 on footer accounts for the mobile bottom nav bar.
        */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[82vh] flex-col rounded-t-2xl bg-background shadow-2xl"
        >
          {/* Drag handle */}
          <div className="flex shrink-0 justify-center pb-1 pt-3">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header — shrink-0 so it never scrolls */}
          <div className="shrink-0 border-b border-border px-5 pb-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold">Filters & Sort</h3>
              <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable options — the ONLY part that scrolls */}
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* Sort */}
            <div className="mb-5">
              <p className="mb-2 font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sort By</p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`rounded-full border px-3 py-1.5 font-body text-xs font-medium transition-colors ${
                      sortBy === opt.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="mb-5">
              <p className="mb-2 font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Price Range</p>
              <div className="flex flex-col gap-0.5">
                {PRICE_RANGES.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setPriceRange(r.label)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-body text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {priceRange === r.label && <Check className="h-3.5 w-3.5 text-primary" />}
                    </span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            {allSizes.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Size</p>
                <div className="flex flex-wrap gap-2">
                  {allSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setSelectedSizes(
                          selectedSizes.includes(s)
                            ? selectedSizes.filter((x) => x !== s)
                            : [...selectedSizes, s]
                        )
                      }
                      className={`rounded border px-3 py-1.5 font-body text-sm font-medium transition-colors ${
                        selectedSizes.includes(s)
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="mb-2">
              <p className="mb-2 font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Availability</p>
              <button
                onClick={() => setShowInStock(!showInStock)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 font-body text-sm transition-colors ${
                  showInStock
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {showInStock && <Check className="h-4 w-4" />}
                In Stock Only
              </button>
            </div>

          </div>

          {/* Footer — OUTSIDE scroll, always pinned at bottom */}
          <div className="shrink-0 border-t border-border px-5 pb-16 pt-4">
            <div className="flex gap-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { onClear(); onClose(); }}
                  className="flex-1 rounded-full border border-border py-3 font-body text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Clear all ({activeFilterCount})
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 rounded-full bg-foreground py-3 font-body text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Show results
              </button>
            </div>
          </div>

        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// Main component
const ProductGrid = () => {
  const [products, setProducts]       = useState<Product[]>([]);
  const [categories, setCategories]   = useState<string[]>([]);
  const [allSizes, setAllSizes]       = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);

  const [searchQuery, setSearchQuery]       = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange]         = useState<PriceRangeLabel>("All prices");
  const [selectedSizes, setSelectedSizes]   = useState<string[]>([]);
  const [showInStock, setShowInStock]       = useState(false);
  const [sortBy, setSortBy]                 = useState<SortValue>("default");

  const [openDropdown, setOpenDropdown]       = useState<"price" | "size" | "sort" | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const lastDocRef        = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const isFetching        = useRef(false);
  const hasMoreRef        = useRef(true);
  const observerRef       = useRef<IntersectionObserver | null>(null);
  const fetchMoreRef      = useRef<() => Promise<void>>();
  const searchRef         = useRef<HTMLInputElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-filter-root]")) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const activeFilterCount = [
    priceRange !== "All prices",
    selectedSizes.length > 0,
    showInStock,
    sortBy !== "default",
  ].filter(Boolean).length;

  const hasActiveFilters = !!(
    searchQuery || activeCategory ||
    priceRange !== "All prices" || selectedSizes.length || showInStock || sortBy !== "default"
  );

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveCategory(null);
    setPriceRange("All prices");
    setSelectedSizes([]);
    setShowInStock(false);
    setSortBy("default");
  };

  if (loading) {
    return (
      <section id="products" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-6 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="mb-4 h-10 w-full animate-pulse rounded-full bg-muted" />
        <div className="mb-4 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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

  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-6 sm:mb-8"
      >
        <p className="mb-2 font-body text-xs font-medium uppercase tracking-[0.2em] text-primary sm:mb-3 sm:text-sm">
          Curated for You
        </p>
        <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">Our Collection</h2>
        <p className="mt-1.5 font-body text-sm text-muted-foreground sm:mt-2 sm:text-base">
          Explore our handpicked selection of traditional and western wear
        </p>
      </motion.div>

      {/* Search */}
      <div className="relative mb-4 sm:mb-5">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search products..."
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

      {/* Category pills */}
      {categories.length > 0 && (
        <div
          ref={categoryScrollRef}
          className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mb-5 sm:flex-wrap sm:overflow-visible sm:pb-0"
        >
          <Button
            variant={!activeCategory && !searchQuery ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveCategory(null); setSearchQuery(""); }}
            className="shrink-0 rounded-full font-body text-xs sm:text-sm"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
              className="shrink-0 rounded-full font-body text-xs sm:text-sm"
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 sm:mb-5">

        {/* Mobile: Filters button + active chips */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={() => setFilterSheetOpen(true)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-body text-xs font-medium transition-colors ${
              activeFilterCount > 0
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background font-body text-[10px] font-bold text-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {priceRange !== "All prices" && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-xs">
                {priceRange}
                <button onClick={() => setPriceRange("All prices")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedSizes.map((s) => (
              <span key={s} className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-xs">
                {s}
                <button onClick={() => setSelectedSizes(selectedSizes.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
              </span>
            ))}
            {showInStock && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-xs">
                In Stock
                <button onClick={() => setShowInStock(false)}><X className="h-3 w-3" /></button>
              </span>
            )}
            {sortBy !== "default" && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-xs">
                {SORT_OPTIONS.find((o) => o.value === sortBy)!.label}
                <button onClick={() => setSortBy("default")}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="shrink-0 font-body text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Desktop: inline dropdowns */}
        <div data-filter-root="" className="hidden sm:flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />

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

          {allSizes.length > 0 && (
            <FilterDropdown
              label={selectedSizes.length === 0 ? "Size" : `Size: ${selectedSizes.join(", ")}`}
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

          <FilterDropdown
            label={sortBy === "default" ? "Sort" : SORT_OPTIONS.find((o) => o.value === sortBy)!.label}
            open={openDropdown === "sort"}
            onToggle={() => setOpenDropdown((o) => o === "sort" ? null : "sort")}
            active={sortBy !== "default"}
            alignRight
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

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="ml-auto flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      <p className="mb-4 font-body text-xs text-muted-foreground sm:text-sm">
        {searchQuery
          ? `${filtered.length}${hasMore && filtered.length >= PAGE_SIZE ? "+" : ""} results for "${searchQuery}"`
          : activeCategory
          ? `${filtered.length}${hasMore ? "+" : ""} ${filtered.length === 1 ? "product" : "products"} in ${activeCategory}`
          : `${products.length}${hasMore ? "+" : ""} products`}
      </p>

      {filtered.length === 0 && !loadingMore ? (
        <div className="py-20 text-center">
          <p className="font-heading text-lg font-semibold">No products found</p>
          <p className="mt-1 font-body text-sm text-muted-foreground">Try adjusting your search or filters</p>
          <Button className="mt-4 rounded-full" onClick={clearAllFilters}>Clear filters</Button>
        </div>
      ) : (
        <>
          <motion.div
            key={`${activeCategory}-${searchQuery}-${sortBy}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
            {loadingMore && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
          </motion.div>

          {hasMore && <div ref={attachObserver} className="h-4 w-full" aria-hidden="true" />}
          {loadingMore && (
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          {!hasMore && products.length > PAGE_SIZE && (
            <p className="mt-10 text-center font-body text-xs text-muted-foreground sm:text-sm">
              You have seen all {products.length} products
            </p>
          )}
        </>
      )}

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        allSizes={allSizes}
        selectedSizes={selectedSizes}
        setSelectedSizes={setSelectedSizes}
        showInStock={showInStock}
        setShowInStock={setShowInStock}
        sortBy={sortBy}
        setSortBy={setSortBy}
        activeFilterCount={activeFilterCount}
        onClear={clearAllFilters}
      />
    </section>
  );
};

export default ProductGrid;
