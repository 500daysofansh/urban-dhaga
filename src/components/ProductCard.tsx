import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Product, JEWELRY_CATEGORIES } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cardImage } from "@/lib/cloudinary";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

const StarRating = ({ rating, count }: { rating: number; count: number }) => (
  <div className="flex items-center gap-1">
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-2.5 w-2.5" viewBox="0 0 12 12">
          <polygon
            points="6,1 7.5,4.5 11,5 8.5,7.5 9.2,11 6,9.2 2.8,11 3.5,7.5 1,5 4.5,4.5"
            fill={i < Math.floor(rating) ? "hsl(var(--accent))" : "hsl(var(--border))"}
          />
        </svg>
      ))}
    </div>
    <span className="font-body text-[11px] text-muted-foreground">({count})</span>
  </div>
);

const SLIDE_INTERVAL = 2200;

const ProductCard = ({ product, priority = false }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // FIX: evaluate isMobile synchronously so the very first render already
  // has the correct value. The old pattern (useRef(false) + useEffect) meant
  // the first render always saw false, and because ref changes don't trigger
  // re-renders the motion.div kept the desktop animation (opacity: 0 →
  // whileInView), leaving cards invisible until they scrolled into view —
  // which produced blank spaces in the mobile product grid.
  const isMobile = useRef(typeof window !== "undefined" && window.innerWidth < 768);

  // FIX: track whether a child interactive element was tapped/clicked.
  // On iOS, stopPropagation() on a touchend doesn't reliably cancel the
  // synthesised click that bubbles to the parent card div. Instead we set a
  // flag and gate the navigate() behind it.
  const childInteractedRef = useRef(false);

  const wishlisted = isWishlisted(product.id);
  const allImages = product.images?.length > 0 ? product.images : [product.image];
  const isJewelry = JEWELRY_CATEGORIES.some(
    (c) => c.toLowerCase() === product.category.toLowerCase()
  );
  const hasSizes = !isJewelry && product.sizes && product.sizes.length > 0;
  const outOfStock = !product.inStock || product.quantity <= 0;
  const isLimited = !outOfStock && product.quantity <= 5;
  const hasMultiple = allImages.length > 1;

  const badgeLabel = outOfStock ? "Out of stock" : isLimited ? "Limited" : "Handcrafted";
  const badgeClass = outOfStock
    ? "bg-muted text-muted-foreground border-border"
    : isLimited
    ? "bg-accent/10 text-accent border-accent/30"
    : "bg-background text-muted-foreground border-border";

  const { rating, reviewCount } = useMemo(() => ({
    rating: 4 + (product.id.charCodeAt(0) % 10) / 10,
    reviewCount: 20 + (product.id.charCodeAt(0) * 7) % 180,
  }), [product.id]);

  const optimizedImages = useMemo(
    () => allImages.map((src) => cardImage(src)),
    [allImages]
  );

  // ── Mobile: intersection-observer-gated auto-slideshow ────────────────────
  useEffect(() => {
    if (!isMobile.current || !hasMultiple) return;
    const card = cardRef.current;
    if (!card) return;

    const startSlide = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        setActiveIdx((prev) => (prev + 1) % allImages.length);
      }, SLIDE_INTERVAL);
    };

    const stopSlide = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startSlide();
        else { stopSlide(); setActiveIdx(0); }
      },
      { threshold: 0.4 }
    );

    observer.observe(card);
    return () => { observer.disconnect(); stopSlide(); };
  }, [hasMultiple, allImages.length]);

  const handleMouseEnter = () => {
    if (isMobile.current) return;
    setIsHovered(true);
    if (hasMultiple) {
      const img = new Image();
      img.src = optimizedImages[1];
    }
  };

  const displayImage = isMobile.current
    ? optimizedImages[activeIdx] ?? optimizedImages[0]
    : isHovered && hasMultiple
    ? optimizedImages[1]
    : optimizedImages[0];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCardClick = () => {
    // If a child button (size, wishlist, add-to-cart) handled this interaction,
    // absorb the event and reset the flag. This is the iOS fix.
    if (childInteractedRef.current) {
      childInteractedRef.current = false;
      return;
    }
    navigate(`/product/${product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    childInteractedRef.current = true;
    if (outOfStock) return;
    if (hasSizes && !selectedSize) {
      toast({ title: "Please select a size", variant: "destructive" });
      return;
    }
    addToCart(product, selectedSize);
    toast({
      title: "Added to cart",
      description: `${product.name}${selectedSize ? ` (${selectedSize})` : ""}`,
    });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    childInteractedRef.current = true;
    toggleWishlist(product);
    toast({
      title: wishlisted ? "Removed from wishlist" : "Added to wishlist",
      description: product.name,
    });
  };

  const handleSizeClick = (e: React.MouseEvent, size: string) => {
    e.stopPropagation();
    e.preventDefault(); // belt-and-suspenders for iOS touch→click synthesis
    childInteractedRef.current = true;
    setSelectedSize((prev) => (prev === size ? undefined : size));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={isMobile.current ? false : { opacity: 0, y: 16 }}
      whileInView={isMobile.current ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
    >
      <div
        ref={cardRef}
        className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors duration-200 hover:border-border/80"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        {/* ── Image ── */}
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <img
            src={displayImage}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`h-full w-full object-cover transition-all duration-700 ${
              isHovered && !isMobile.current ? "scale-105" : "scale-100"
            } ${outOfStock ? "opacity-70" : ""}`}
          />

          {/* Badge */}
          <span className={`absolute left-2.5 top-2.5 rounded-full border px-2.5 py-0.5 font-body text-[11px] font-medium ${badgeClass}`}>
            {badgeLabel}
          </span>

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur-sm transition-colors hover:bg-background"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className={`h-3.5 w-3.5 transition-colors ${
                wishlisted ? "fill-accent text-accent" : "text-muted-foreground"
              }`}
            />
          </button>

          {/* Slideshow dots */}
          {hasMultiple && (
            <div className={`absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1 transition-opacity duration-300 ${
              isMobile.current ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}>
              {allImages.slice(0, 4).map((_, idx) => (
                <span
                  key={idx}
                  className={`rounded-full transition-all duration-300 ${
                    activeIdx === idx ||
                    (!isMobile.current && isHovered && idx === 1) ||
                    (!isMobile.current && !isHovered && idx === 0)
                      ? "h-1.5 w-4 bg-white"
                      : "h-1.5 w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-3 sm:p-4">
          <p className="mb-1 font-body text-[11px] uppercase tracking-widest text-muted-foreground">
            {product.category}
          </p>
          <h3 className="mb-2 truncate font-heading text-sm font-semibold text-foreground sm:text-base">
            {product.name}
          </h3>
          <div className="mb-3">
            <StarRating rating={rating} count={reviewCount} />
          </div>

          {/* Size buttons */}
          {hasSizes && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {product.sizes!.map((size) => (
                <button
                  key={size}
                  onClick={(e) => handleSizeClick(e, size)}
                  // touchstart sets the flag immediately, before iOS synthesises
                  // the click — this is the most reliable interception point.
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    childInteractedRef.current = true;
                  }}
                  className={`rounded border px-2 py-0.5 font-body text-[11px] font-medium transition-colors ${
                    selectedSize === size
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/50"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className={`font-heading text-base font-semibold sm:text-lg ${outOfStock ? "text-muted-foreground" : "text-foreground"}`}>
              ₹{product.price.toLocaleString("en-IN")}
            </span>

            {outOfStock ? (
              <span className="rounded-full border border-border bg-muted px-3 py-1 font-body text-xs text-muted-foreground">
                Sold out
              </span>
            ) : (
              <button
                onClick={handleAddToCart}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  childInteractedRef.current = true;
                }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 font-body text-xs font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-muted"
              >
                <ShoppingBag className="h-3 w-3" />
                Add to cart
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
