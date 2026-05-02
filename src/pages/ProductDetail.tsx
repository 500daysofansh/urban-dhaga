import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, JEWELRY_CATEGORIES } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ArrowLeft, Star, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { detailImage, optimizeImage } from "@/lib/cloudinary";

// ─── Optimised image component with blur-up effect ────────────────────────────
// Shows a tiny blurred placeholder instantly while the full image loads.
// This makes the page feel fast even on slow connections.

const CloudImage = ({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) => {
  const [loaded, setLoaded] = useState(false);

  // Tiny 20px-wide placeholder — loads in ~200 bytes, appears instantly
  const tinyUrl = optimizeImage(src, 20);
  // Full display-size URL
  const fullUrl = detailImage(src); // 800px wide, f_auto, q_auto:good

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blurred placeholder — visible while full image loads */}
      <img
        src={tinyUrl}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? "opacity-0" : "opacity-100 blur-xl scale-110"
        }`}
      />
      {/* Full image */}
      <img
        src={fullUrl}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        onLoad={() => setLoaded(true)}
        className={`relative h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

// ─── ProductDetail ────────────────────────────────────────────────────────────

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [product, setProduct]             = useState<Product | null>(null);
  const [loading, setLoading]             = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize]   = useState<string | undefined>();
  const [quantity, setQuantity]           = useState(1);

  // ── Touch / swipe state ──────────────────────────────────────────────────
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    // Only trigger if horizontal swipe > 40px and more horizontal than vertical
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      deltaX > 0 ? goNext() : goPrev();
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "products", id));
        if (snap.exists()) setProduct({ id: snap.id, ...snap.data() } as Product);
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  // Preload adjacent images so switching thumbnails feels instant
  const preloadAdjacent = useCallback((images: string[], current: number) => {
    const next = (current + 1) % images.length;
    const prev = (current - 1 + images.length) % images.length;
    [next, prev].forEach((idx) => {
      if (idx !== current) {
        const img = new Image();
        img.src = detailImage(images[idx]);
      }
    });
  }, []);

  useEffect(() => {
    if (product) {
      const imgs = product.images?.length > 0 ? product.images : [product.image];
      preloadAdjacent(imgs, selectedImage);
    }
  }, [product, selectedImage, preloadAdjacent]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 h-9 w-20 animate-pulse rounded-full bg-muted" />
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Image skeleton — portrait ratio matches real photos */}
              <div className="space-y-4">
                <div className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
                <div className="flex gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 w-20 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              </div>
              <div className="space-y-5">
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted" />
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
                </div>
                <div className="flex gap-2">
                  {["S", "M", "L", "XL"].map((s) => (
                    <div key={s} className="h-10 w-14 animate-pulse rounded-full bg-muted" />
                  ))}
                </div>
                <div className="h-14 w-full animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pb-16 md:pb-0">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground">Product not found</h2>
            <Button onClick={() => navigate("/")} className="mt-4 font-body">Go Home</Button>
          </div>
        </main>
      </div>
    );
  }

  const allImages  = product.images?.length > 0 ? product.images : [product.image];
  const isJewelry  = JEWELRY_CATEGORIES.some((c) => c.toLowerCase() === product.category.toLowerCase());
  const hasSizes   = !isJewelry && product.sizes && product.sizes.length > 0;
  const outOfStock = !product.inStock || product.quantity <= 0;
  const rating     = 4.3;
  const reviewCount = 127;

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      toast({ title: "Please select a size", variant: "destructive" });
      return;
    }
    for (let i = 0; i < quantity; i++) addToCart(product, selectedSize);
    toast({
      title: "Added to cart",
      description: `${product.name}${selectedSize ? ` (${selectedSize})` : ""} ×${quantity}`,
    });
  };

  const goPrev = () => setSelectedImage((p) => (p - 1 + allImages.length) % allImages.length);
  const goNext = () => setSelectedImage((p) => (p + 1) % allImages.length);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2 font-body">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="grid gap-8 lg:grid-cols-2">

            {/* ── Image panel ── */}
            <div className="space-y-3">

              {/* Main image — swipeable on mobile, portrait ratio (4:5)
                  Added `group` so desktop hover shows the arrow buttons. */}
              <div
                className="group relative overflow-hidden rounded-2xl bg-muted aspect-[4/5]"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <CloudImage
                  src={allImages[selectedImage]}
                  alt={product.name}
                  className="h-full w-full"
                  eager={true}
                />

                {/* Prev / Next arrows — always visible on mobile, hover-only on desktop */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-sm transition-opacity hover:bg-black/50 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-sm transition-opacity hover:bg-black/50 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Dot indicator */}
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {allImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(idx)}
                          className={`rounded-full transition-all duration-300 ${
                            idx === selectedImage
                              ? "w-5 h-1.5 bg-white"
                              : "w-1.5 h-1.5 bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── Thumbnails ─────────────────────────────────────────────────
                  FIX: `overflow-hidden` on the same element as `ring` causes
                  the ring to be clipped by border-radius, making the outline
                  look irregular/broken. Solution: outer <button> holds only
                  the ring + focus styles (no overflow-hidden), inner <span>
                  handles the clipping. This way the ring renders fully outside
                  the box and stays perfectly uniform.
              ──────────────────────────────────────────────────────────────── */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-0.5 pt-0.5 pb-1 scrollbar-hide">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative aspect-[4/5] h-23 shrink-0 rounded-xl transition-all duration-200 ring-2 ring-offset-2 focus:outline-none ${
                        idx === selectedImage
                          ? "ring-primary opacity-100"
                          : "ring-transparent opacity-60 hover:opacity-90 hover:ring-border"
                      }`}
                    >
                      {/* Inner span clips the image to rounded corners independently
                          of the outer ring — this is the key fix for irregular outlines */}
                      <span className="block h-full w-full overflow-hidden rounded-[10px]">
                        <img
                          src={optimizeImage(img, 160)}
                          alt={`View ${idx + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Product details ── */}
            <div className="space-y-6">

              <div>
                <Badge className="mb-3 font-body">{product.category}</Badge>
                <h1 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  {product.name}
                </h1>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(rating) ? "fill-saffron text-saffron" : "text-muted"}`}
                    />
                  ))}
                </div>
                <span className="font-body text-sm text-muted-foreground">
                  {rating} ({reviewCount} reviews)
                </span>
              </div>

              {/* Price */}
              <p className="font-heading text-3xl font-bold text-foreground">
                ₹{product.price.toLocaleString("en-IN")}
              </p>

              {/* Description */}
              <p className="font-body leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              {/* Sizes */}
              {hasSizes && (
                <div>
                  <p className="mb-3 font-body text-sm font-semibold text-foreground">Select Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes!.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-full border px-5 py-2 font-body text-sm font-medium transition-all ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-input bg-background text-foreground hover:border-primary/50"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <p className="mb-3 font-body text-sm font-semibold text-foreground">Quantity</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center font-body font-semibold text-foreground">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Stock warning */}
              {!outOfStock && product.quantity <= 5 && (
                <p className="font-body text-sm font-medium text-destructive">
                  Only {product.quantity} left in stock — order soon!
                </p>
              )}

              {/* CTA */}
              {outOfStock ? (
                <div className="rounded-full border border-border bg-muted px-6 py-4 text-center font-body text-sm font-medium text-muted-foreground">
                  Out of Stock
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className="w-full gap-2 rounded-full py-6 font-body text-base"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Add to Cart
                </Button>
              )}

              {/* WhatsApp order */}
              <button
                onClick={() => {
                  const msg = `Hi! I want to order:\n*${product.name}*${selectedSize ? ` (Size: ${selectedSize})` : ""}\n₹${product.price.toLocaleString("en-IN")}\nPlease confirm availability.`;
                  window.open(`https://wa.me/918419856013?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-green-200 bg-green-50 py-3.5 font-body text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Order via WhatsApp
              </button>

            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProductDetail;
