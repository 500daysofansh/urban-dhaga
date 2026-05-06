import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, limit, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Score a candidate product against the current product.
 * Higher = more similar.
 *   +3  same category
 *   +1  price within ±40%
 */
const similarity = (current: Product, candidate: Product): number => {
  let score = 0;
  if (candidate.category === current.category) score += 3;
  const lo = current.price * 0.6;
  const hi = current.price * 1.4;
  if (candidate.price >= lo && candidate.price <= hi) score += 1;
  return score;
};

// ── HorizontalCarousel ────────────────────────────────────────────────────────

interface CarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
}

const HorizontalCarousel = ({ title, subtitle, products }: CarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [products]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -360 : 360, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45 }}
      className="relative"
    >
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 font-body text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Arrow buttons — desktop only */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="
          flex gap-3 overflow-x-auto pb-3
          [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          snap-x snap-mandatory
        "
      >
        {products.map((product, i) => (
          <div
            key={product.id}
            className="w-[160px] shrink-0 snap-start sm:w-[200px] lg:w-[220px]"
          >
            <ProductCard product={product} priority={i < 2} />
          </div>
        ))}
      </div>

      {/* Fade edges — desktop only */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-[52px] bottom-3 w-8 bg-gradient-to-r from-background to-transparent hidden sm:block" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-[52px] bottom-3 w-8 bg-gradient-to-l from-background to-transparent hidden sm:block" />
      )}
    </motion.div>
  );
};

// ── Skeleton carousel ─────────────────────────────────────────────────────────

const CarouselSkeleton = ({ title }: { title: string }) => (
  <div>
    <div className="mb-4 h-7 w-48 animate-pulse rounded-lg bg-muted" aria-label={`Loading ${title}`} />
    <div className="flex gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-[160px] shrink-0 sm:w-[200px]">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="aspect-[4/5] animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── ProductRecommendations ────────────────────────────────────────────────────

interface Props {
  currentProduct: Product;
  /** IDs from useRecentlyViewed (newest-first, includes current product) */
  recentlyViewedIds: string[];
}

type LoadState = "loading" | "done";

const MAX_SIMILAR = 8;
const MAX_RECENT = 8;
// Each parallel pool query fetches this many docs
const CATEGORY_POOL = 30; // same-category products (guaranteed in pool)
const GENERAL_POOL  = 30; // alphabetical general fallback for diversity

const ProductRecommendations = ({ currentProduct, recentlyViewedIds }: Props) => {
  const [similar, setSimilar] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  // FIX: initialise both states as "loading" so the skeleton renders
  // immediately on mount — before the useEffect fires — instead of the
  // component returning null due to the old "idle" early-return guard.
  const [similarState, setSimilarState] = useState<LoadState>("loading");
  const [recentState, setRecentState] = useState<LoadState>("loading");

  // ── "You May Also Like": two parallel queries, merged + scored ────────────
  //
  // Two queries run in parallel:
  //   1. where("category", "==", ...) limit(30) — guarantees same-category
  //      products are in the pool regardless of their name/order in Firestore.
  //   2. orderBy("name") limit(30) — general diversity fallback.
  //
  // Results are merged, deduplicated, scored, and the top MAX_SIMILAR shown.
  // No extra Firestore composite index needed: query 1 is a single-field
  // equality filter (no orderBy), query 2 is the existing name index.
  useEffect(() => {
    let cancelled = false;
    setSimilarState("loading");

    (async () => {
      try {
        const [categorySnap, generalSnap] = await Promise.all([
          // Query 1: all products in the same category
          getDocs(
            query(
              collection(db, "products"),
              where("category", "==", currentProduct.category),
              limit(CATEGORY_POOL)
            )
          ),
          // Query 2: general diversity pool ordered alphabetically
          getDocs(
            query(collection(db, "products"), orderBy("name"), limit(GENERAL_POOL))
          ),
        ]);

        if (cancelled) return;

        // Merge both result sets, deduplicate by document id
        const seen = new Set<string>();
        const pool: Product[] = [];
        for (const snap of [categorySnap, generalSnap]) {
          for (const d of snap.docs) {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              pool.push({ id: d.id, ...d.data() } as Product);
            }
          }
        }

        // Filter out the current product and out-of-stock items
        const candidates = pool
          .filter((p) => p.id !== currentProduct.id)
          .filter((p) => p.inStock && p.quantity > 0);

        // Score, sort by score desc then price asc, take top MAX_SIMILAR
        const scored = candidates
          .map((p) => ({ p, score: similarity(currentProduct, p) }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score || a.price - b.price)
          .map(({ p }) => p)
          .slice(0, MAX_SIMILAR);

        setSimilar(scored);
      } catch (err) {
        console.error("ProductRecommendations: similar fetch failed", err);
      } finally {
        if (!cancelled) setSimilarState("done");
      }
    })();

    return () => { cancelled = true; };
  }, [currentProduct.id, currentProduct.category, currentProduct.price]);

  // ── "Recently Viewed": hydrate IDs → full Product objects ────────────────
  useEffect(() => {
    const ids = recentlyViewedIds
      .filter((id) => id !== currentProduct.id)
      .slice(0, MAX_RECENT);

    if (ids.length === 0) {
      setRecentProducts([]);
      setRecentState("done");
      return;
    }

    let cancelled = false;
    setRecentState("loading");

    (async () => {
      try {
        // Firestore "in" filter supports max 10 values — batch if needed
        const BATCH = 10;
        const batches: Product[][] = [];
        for (let i = 0; i < ids.length; i += BATCH) {
          const chunk = ids.slice(i, i + BATCH);
          const snap = await getDocs(
            query(collection(db, "products"), where("__name__", "in", chunk))
          );
          batches.push(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
        }

        if (cancelled) return;

        // Re-order by original ids array (most-recent first)
        const byId = new Map(batches.flat().map((p) => [p.id, p]));
        const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
        setRecentProducts(ordered);
      } catch (err) {
        console.error("ProductRecommendations: recently-viewed fetch failed", err);
      } finally {
        if (!cancelled) setRecentState("done");
      }
    })();

    return () => { cancelled = true; };
  }, [recentlyViewedIds, currentProduct.id]);

  // FIX: removed the "idle" early-return guard that was causing the section
  // to return null on the first render before the useEffect could fire.
  // Now we only bail out when both fetches are done and both came back empty.
  if (
    similarState === "done" && similar.length === 0 &&
    recentState === "done" && recentProducts.length === 0
  ) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="space-y-12">

        {similarState === "loading" ? (
          <CarouselSkeleton title="You May Also Like" />
        ) : similar.length > 0 ? (
          <HorizontalCarousel
            title="You May Also Like"
            subtitle={`More from ${currentProduct.category}`}
            products={similar}
          />
        ) : null}

        {recentState === "loading" ? (
          <CarouselSkeleton title="Recently Viewed" />
        ) : recentProducts.length > 0 ? (
          <HorizontalCarousel
            title="Recently Viewed"
            products={recentProducts}
          />
        ) : null}

      </div>
    </section>
  );
};

export default ProductRecommendations;
