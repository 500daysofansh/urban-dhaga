import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  query,
  limit,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────

const IS_MOBILE =
  typeof window !== "undefined" && window.innerWidth < 768;

const MAX_SIMILAR = IS_MOBILE ? 4 : 8;
const MAX_RECENT = IS_MOBILE ? 4 : 8;

const CATEGORY_POOL = IS_MOBILE ? 12 : 24;
const GENERAL_POOL = IS_MOBILE ? 12 : 24;

// ─────────────────────────────────────────────────────────────

const similarity = (current: Product, candidate: Product): number => {
  let score = 0;

  if (candidate.category === current.category) score += 3;

  const lo = current.price * 0.6;
  const hi = current.price * 1.4;

  if (candidate.price >= lo && candidate.price <= hi) {
    score += 1;
  }

  return score;
};

// ─────────────────────────────────────────────────────────────

interface CarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
}

const HorizontalCarousel = ({
  title,
  subtitle,
  products,
}: CarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (IS_MOBILE) return;

    const el = scrollRef.current;

    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 8);

    setCanScrollRight(
      el.scrollLeft < el.scrollWidth - el.clientWidth - 8
    );
  };

  useEffect(() => {
    if (IS_MOBILE) return;

    checkScroll();

    const el = scrollRef.current;

    if (!el) return;

    el.addEventListener("scroll", checkScroll, {
      passive: true,
    });

    return () => {
      el.removeEventListener("scroll", checkScroll);
    };
  }, [products]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;

    if (!el) return;

    el.scrollBy({
      left: dir === "left" ? -280 : 280,
      behavior: "smooth",
    });
  };

  if (products.length === 0) return null;

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-0.5 font-body text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Desktop arrows only */}
        {!IS_MOBILE && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Track */}
      <div
        ref={scrollRef}
        className="
          flex gap-3 overflow-x-auto pb-2
          snap-x snap-mandatory
          [-ms-overflow-style:none]
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {products.map((product, i) => (
          <div
            key={product.id}
            className="
              shrink-0 snap-start
              w-[150px]
              sm:w-[190px]
              lg:w-[220px]
            "
          >
            <ProductCard
              product={product}
              priority={i < 2}
            />
          </div>
        ))}
      </div>

      {/* Desktop fade edges */}
      {!IS_MOBILE && canScrollLeft && (
        <div className="pointer-events-none absolute bottom-2 left-0 top-[52px] hidden w-8 bg-gradient-to-r from-background to-transparent sm:block" />
      )}

      {!IS_MOBILE && canScrollRight && (
        <div className="pointer-events-none absolute bottom-2 right-0 top-[52px] hidden w-8 bg-gradient-to-l from-background to-transparent sm:block" />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────

const CarouselSkeleton = ({
  title,
}: {
  title: string;
}) => (
  <div>
    <div className="mb-4 h-7 w-48 animate-pulse rounded-lg bg-muted" />

    <div className="flex gap-3 overflow-hidden">
      {Array.from({
        length: IS_MOBILE ? 2 : 4,
      }).map((_, i) => (
        <div
          key={i}
          className="
            shrink-0
            w-[150px]
            sm:w-[190px]
          "
        >
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

// ─────────────────────────────────────────────────────────────

interface Props {
  currentProduct: Product;
  recentlyViewedIds: string[];
}

type LoadState = "loading" | "done";

// ─────────────────────────────────────────────────────────────

const ProductRecommendations = ({
  currentProduct,
  recentlyViewedIds,
}: Props) => {
  const [similar, setSimilar] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  const [similarState, setSimilarState] =
    useState<LoadState>("loading");

  const [recentState, setRecentState] =
    useState<LoadState>("loading");

  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    setSimilarState("loading");

    (async () => {
      try {
        const [categorySnap, generalSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "products"),
              where("category", "==", currentProduct.category),
              limit(CATEGORY_POOL)
            )
          ),

          getDocs(
            query(
              collection(db, "products"),
              orderBy("name"),
              limit(GENERAL_POOL)
            )
          ),
        ]);

        if (cancelled) return;

        const seen = new Set<string>();

        const pool: Product[] = [];

        for (const snap of [categorySnap, generalSnap]) {
          for (const d of snap.docs) {
            if (!seen.has(d.id)) {
              seen.add(d.id);

              pool.push({
                id: d.id,
                ...d.data(),
              } as Product);
            }
          }
        }

        const candidates = pool
          .filter((p) => p.id !== currentProduct.id)
          .filter((p) => p.inStock && p.quantity > 0);

        const scored = candidates
          .map((p) => ({
            p,
            score: similarity(currentProduct, p),
          }))
          .filter(({ score }) => score > 0)
          .sort(
            (a, b) =>
              b.score - a.score ||
              a.p.price - b.p.price
          )
          .map(({ p }) => p)
          .slice(0, MAX_SIMILAR);

        setSimilar(scored);
      } catch (err) {
        console.error(
          "ProductRecommendations similar fetch failed",
          err
        );
      } finally {
        if (!cancelled) {
          setSimilarState("done");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentProduct.id,
    currentProduct.category,
    currentProduct.price,
  ]);

  // ─────────────────────────────────────────────────────────

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
        const BATCH = 10;

        const batches: Product[][] = [];

        for (let i = 0; i < ids.length; i += BATCH) {
          const chunk = ids.slice(i, i + BATCH);

          const snap = await getDocs(
            query(
              collection(db, "products"),
              where("__name__", "in", chunk)
            )
          );

          batches.push(
            snap.docs.map(
              (d) =>
                ({
                  id: d.id,
                  ...d.data(),
                }) as Product
            )
          );
        }

        if (cancelled) return;

        const byId = new Map(
          batches.flat().map((p) => [p.id, p])
        );

        const ordered = ids
          .map((id) => byId.get(id))
          .filter(Boolean) as Product[];

        setRecentProducts(ordered);
      } catch (err) {
        console.error(
          "Recently viewed fetch failed",
          err
        );
      } finally {
        if (!cancelled) {
          setRecentState("done");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recentlyViewedIds, currentProduct.id]);

  // ─────────────────────────────────────────────────────────

  const shouldRender = useMemo(() => {
    return (
      similar.length > 0 ||
      recentProducts.length > 0 ||
      similarState === "loading" ||
      recentState === "loading"
    );
  }, [
    similar,
    recentProducts,
    similarState,
    recentState,
  ]);

  if (!shouldRender) return null;

  // ─────────────────────────────────────────────────────────

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-10">

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
