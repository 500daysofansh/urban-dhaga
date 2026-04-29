import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Product, JEWELRY_CATEGORIES } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cardImage } from "@/lib/cloudinary";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

const CRAFT_STORIES: Record<string, string> = {
  "Sarees": "Hand-woven by master weavers from Varanasi",
  "Kurtas": "Block printed by artisans from Jaipur",
  "Dupattas": "Bandhani tie-dye craft from Gujarat",
  "Accessories": "Handcrafted by artisan families from Rajasthan",
  "Lehengas": "Chikankari embroidery from Lucknow",
  "Jewellery": "Kundan work by goldsmiths from Bikaner",
  "Western": "Contemporary styles with Indian craftsmanship",
};

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

// Only animate cards on desktop — animating 20+ cards on budget Android phones
// causes scroll jank and delays perceived load time significantly.
const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

const ProductCard = ({ product, priority = false }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const allImages = product.images?.length > 0 ? product.images : [product.image];
  const isJewelry = JEWELRY_CATEGORIES.some(
    (c) => c.toLowerCase() === product.category.toLowerCase()
  );
  const hasSizes = !isJewelry && product.sizes && product.sizes.length > 0;
  const outOfStock = !product.inStock || product.quantity <= 0;
  const isLimited = !outOfStock && product.quantity <= 5;

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

  // Optimized URLs — served at 400px wide, auto-format (WebP on phones), compressed
  const optimizedImages = useMemo(
    () => allImages.map((src) => cardImage(src)),
    [allImages]
  );

  const displayImage = isHovered && optimizedImages.length > 1
    ? optimizedImages[1]
    : optimizedImages[0];

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Preload hover image via JS — no hidden <img> tags in the DOM
    // (hidden img tags still create network requests and slow down mobile)
    if (allImages.length > 1) {
      const img = new Image();
      img.src = optimizedImages[1];
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    setWishlisted((prev) => !prev);
    toast({
      title: wishlisted ? "Removed from wishlist" : "Added to wishlist",
    });
  };

  const handleSizeClick = (e: React.MouseEvent, size: string) => {
    e.stopPropagation();
    setSelectedSize((prev) => (prev === size ? undefined : size));
  };

  return (
    <motion.div
      // Disable enter animation on mobile to prevent scroll jank
      initial={isMobile ? false : { opacity: 0, y: 16 }}
      whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
    >
      <div
        className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors duration-200 hover:border-border/80"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => navigate(`/product/${product.id}`)}
      >
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <img
            src={displayImage}
            alt={product.name}
            // Priority images (first 4) load eagerly — rest are lazy
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            // Helps browser allocate the right amount of bandwidth per image
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`h-full w-full object-cover transition-transform duration-500 ${
              isHovered ? "scale-105" : "scale-100"
            } ${outOfStock ? "opacity-70" : ""}`}
          />

          {/* Badge top-left */}
          <span className={`absolute left-2.5 top-2.5 rounded-full border px-2.5 py-0.5 font-body text-[11px] font-medium ${badgeClass}`}>
            {badgeLabel}
          </span>

          {/* Wishlist top-right */}
          <button
            onClick={handleWishlist}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur-sm transition-colors hover:bg-background"
          >
            <Heart
              className={`h-3.5 w-3.5 transition-colors ${
                wishlisted ? "fill-accent text-accent" : "text-muted-foreground"
              }`}
            />
          </button>

          {/* Image dots */}
          {allImages.length > 1 && (
            <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1">
              {allImages.slice(0, 4).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 w-1 rounded-full transition-colors ${
                    (isHovered ? 1 : 0) === idx
                      ? "bg-foreground"
                      : "bg-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4">

          {/* Category */}
          <p className="mb-1 font-body text-[11px] uppercase tracking-widest text-muted-foreground">
            {product.category}
          </p>

          {/* Name */}
          <h3 className="mb-2 truncate font-heading text-sm font-semibold text-foreground sm:text-base">
            {product.name}
          </h3>

          {/* Stars */}
          <div className="mb-3">
            <StarRating rating={rating} count={reviewCount} />
          </div>

          {/* Sizes */}
          {hasSizes && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {product.sizes!.map((size) => (
                <button
                  key={size}
                  onClick={(e) => handleSizeClick(e, size)}
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

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-2">
            <span className={`font-heading text-base font-semibold sm:text-lg ${
              outOfStock ? "text-muted-foreground" : "text-foreground"
            }`}>
              ₹{product.price.toLocaleString("en-IN")}
            </span>

            {outOfStock ? (
              <span className="rounded-full border border-border bg-muted px-3 py-1 font-body text-xs text-muted-foreground">
                Sold out
              </span>
            ) : (
              <button
                onClick={handleAddToCart}
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
