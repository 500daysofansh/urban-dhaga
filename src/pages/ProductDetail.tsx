import {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Helmet } from "react-helmet-async";

import { db } from "@/lib/firebase";
import { Product, JEWELRY_CATEGORIES } from "@/types/product";

import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";

import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ShoppingBag,
  ArrowLeft,
  Star,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

import {
  detailImage,
  optimizeImage,
} from "@/lib/cloudinary";

const ProductRecommendations = lazy(
  () => import("@/components/ProductRecommendations")
);

const BASE_URL = "https://www.urbandhage.in";

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

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      <img
        src={src}
        alt={alt}
        width={900}
        height={1100}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className={`relative h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const { addToCart } = useCart();

  const {
    toggleWishlist,
    isWishlisted,
  } = useWishlist();

  const {
    ids: recentlyViewedIds,
    record: recordView,
  } = useRecentlyViewed();

  const { toast } = useToast();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] =
    useState(0);

  const [selectedSize, setSelectedSize] =
    useState<string | undefined>();

  const [quantity, setQuantity] = useState(1);

  const [wishlistPop, setWishlistPop] =
    useState(false);

  const touchStartX = useRef<number>(0);

  const touchStartY = useRef<number>(0);

  const isMobile =
    typeof window !== "undefined" &&
    window.innerWidth < 768;

  const handleTouchStart = (
    e: React.TouchEvent
  ) => {
    touchStartX.current =
      e.touches[0].clientX;

    touchStartY.current =
      e.touches[0].clientY;
  };

  const handleTouchEnd = (
    e: React.TouchEvent
  ) => {
    const dx =
      touchStartX.current -
      e.changedTouches[0].clientX;

    const dy =
      touchStartY.current -
      e.changedTouches[0].clientY;

    if (
      Math.abs(dx) > 40 &&
      Math.abs(dx) > Math.abs(dy)
    ) {
      dx > 0 ? goNext() : goPrev();
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        const snap = await getDoc(
          doc(db, "products", id)
        );

        if (snap.exists()) {
          const p = {
            id: snap.id,
            ...snap.data(),
          } as Product;

          setProduct(p);

          recordView(p.id);
        }
      } catch (err) {
        console.error(
          "Failed to fetch product:",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, recordView]);

  const preloadAdjacent = useCallback(
    (images: string[], current: number) => {
      [
        (current + 1) % images.length,
        (current - 1 + images.length) %
          images.length,
      ]
        .filter((i) => i !== current)
        .forEach((i) => {
          const img = new Image();

          img.src = detailImage(images[i]);
        });
    },
    []
  );

  useEffect(() => {
    if (isMobile) return;

    if (product) {
      const imgs =
        product.images?.length > 0
          ? product.images
          : [product.image];

      preloadAdjacent(imgs, selectedImage);
    }
  }, [
    product,
    selectedImage,
    preloadAdjacent,
    isMobile,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />

        <main className="flex-1 pb-16 md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 h-9 w-20 animate-pulse rounded-full bg-muted" />

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />

                <div className="flex gap-3">
                  {Array.from({
                    length: 4,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 w-20 animate-pulse rounded-xl bg-muted"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />

                <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted" />

                <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />

                <div className="space-y-2">
                  {[1, 0.83, 0.67].map(
                    (w, i) => (
                      <div
                        key={i}
                        className="h-4 animate-pulse rounded bg-muted"
                        style={{
                          width: `${w * 100}%`,
                        }}
                      />
                    )
                  )}
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

        <main className="flex flex-1 items-center justify-center pb-16 md:pb-0">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Product not found
            </h2>

            <Button
              onClick={() => navigate("/")}
              className="mt-4 font-body"
            >
              Go Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const allImages =
    product.images?.length > 0
      ? product.images
      : [product.image];

  const isJewelry =
    JEWELRY_CATEGORIES.some(
      (c) =>
        c.toLowerCase() ===
        product.category.toLowerCase()
    );

  const hasSizes =
    !isJewelry &&
    product.sizes &&
    product.sizes.length > 0;

  const outOfStock =
    !product.inStock ||
    product.quantity <= 0;

  const wishlisted = isWishlisted(product.id);

  const rating = 4.3;

  const reviewCount = 127;

  const canonicalUrl = `${BASE_URL}/product/${product.id}`;

  const ogImage = detailImage(allImages[0]);

  const metaDesc =
    product.description.length > 155
      ? product.description.slice(0, 152) +
        "..."
      : product.description;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: allImages.map(detailImage),
    description: product.description,
    brand: {
      "@type": "Brand",
      name: "Urban Dhage",
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: canonicalUrl,
      seller: {
        "@type": "Organization",
        name: "Urban Dhage",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount,
    },
  };

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      toast({
        title: "Please select a size",
        variant: "destructive",
      });

      return;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart(product, selectedSize);
    }

    toast({
      title: "Added to cart",
      description: `${product.name}${
        selectedSize
          ? ` (${selectedSize})`
          : ""
      } ×${quantity}`,
    });
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product);

    setWishlistPop(true);

    setTimeout(() => {
      setWishlistPop(false);
    }, 300);

    toast({
      title: wishlisted
        ? "Removed from wishlist"
        : "Added to wishlist",
      description: wishlisted
        ? `${product.name} was removed.`
        : `${product.name} was saved.`,
    });
  };

  const goPrev = () => {
    setSelectedImage(
      (p) =>
        (p - 1 + allImages.length) %
        allImages.length
    );
  };

  const goNext = () => {
    setSelectedImage(
      (p) =>
        (p + 1) % allImages.length
    );
  };

  const optimizedMainImage = isMobile
    ? optimizeImage(
        allImages[selectedImage],
        700
      )
    : detailImage(allImages[selectedImage]);

  return (
    <div className="flex min-h-screen flex-col">
      <Helmet>
        <title>
          {product.name} — Urban Dhage
        </title>

        <meta
          name="description"
          content={metaDesc}
        />

        <link
          rel="canonical"
          href={canonicalUrl}
        />

        <meta
          property="og:title"
          content={`${product.name} — Urban Dhage`}
        />

        <meta
          property="og:description"
          content={metaDesc}
        />

        <meta
          property="og:url"
          content={canonicalUrl}
        />

        <meta
          property="og:image"
          content={ogImage}
        />

        <meta
          property="og:type"
          content="product"
        />

        <meta
          property="product:price:amount"
          content={String(product.price)}
        />

        <meta
          property="product:price:currency"
          content="INR"
        />

        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:title"
          content={`${product.name} — Urban Dhage`}
        />

        <meta
          name="twitter:description"
          content={metaDesc}
        />

        <meta
          name="twitter:image"
          content={ogImage}
        />

        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <Navbar />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2 font-body"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <div
                className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted"
                onTouchStart={
                  handleTouchStart
                }
                onTouchEnd={handleTouchEnd}
              >
                <CloudImage
                  src={optimizedMainImage}
                  alt={product.name}
                  className="h-full w-full"
                  eager
                />

                <button
                  onClick={
                    handleToggleWishlist
                  }
                  aria-label={
                    wishlisted
                      ? "Remove from wishlist"
                      : "Add to wishlist"
                  }
                  className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition-transform duration-200 ${
                    wishlisted
                      ? "bg-rose-500 text-white"
                      : "bg-black/40 text-white"
                  } ${
                    wishlistPop
                      ? "scale-110"
                      : "scale-100"
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      wishlisted
                        ? "fill-white"
                        : "fill-transparent"
                    }`}
                  />
                </button>

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white md:flex"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <button
                      onClick={goNext}
                      className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white md:flex"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {allImages.map(
                        (_, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              setSelectedImage(
                                idx
                              )
                            }
                            className={`rounded-full transition-colors duration-200 ${
                              idx ===
                              selectedImage
                                ? "h-1.5 w-5 bg-white"
                                : "h-1.5 w-1.5 bg-white/50"
                            }`}
                          />
                        )
                      )}
                    </div>
                  </>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {allImages.map(
                    (img, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          setSelectedImage(
                            idx
                          )
                        }
                        className={`relative h-20 shrink-0 rounded-xl ring-2 ring-offset-2 transition-opacity duration-200 ${
                          idx ===
                          selectedImage
                            ? "opacity-100 ring-primary"
                            : "opacity-60 ring-transparent"
                        }`}
                      >
                        <img
                          src={optimizeImage(
                            img,
                            120
                          )}
                          alt={`View ${
                            idx + 1
                          }`}
                          width={80}
                          height={100}
                          loading="lazy"
                          decoding="async"
                          className="h-full rounded-xl object-cover"
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <Badge className="mb-3 font-body">
                  {product.category}
                </Badge>

                <h1 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  {product.name}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({
                    length: 5,
                  }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i <
                        Math.floor(rating)
                          ? "fill-saffron text-saffron"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>

                <span className="font-body text-sm text-muted-foreground">
                  {rating} (
                  {reviewCount} reviews)
                </span>
              </div>

              <p className="font-heading text-3xl font-bold text-foreground">
                ₹
                {product.price.toLocaleString(
                  "en-IN"
                )}
              </p>

              <p className="font-body leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              {hasSizes && (
                <div>
                  <p className="mb-3 font-body text-sm font-semibold text-foreground">
                    Select Size
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {product.sizes!.map(
                      (size) => (
                        <button
                          key={size}
                          onClick={() =>
                            setSelectedSize(
                              size
                            )
                          }
                          className={`rounded-full border px-5 py-2 font-body text-sm font-medium transition-colors ${
                            selectedSize ===
                            size
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background text-foreground"
                          }`}
                        >
                          {size}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-3 font-body text-sm font-semibold text-foreground">
                  Quantity
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setQuantity(
                        Math.max(
                          1,
                          quantity - 1
                        )
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>

                  <span className="w-8 text-center font-body font-semibold text-foreground">
                    {quantity}
                  </span>

                  <button
                    onClick={() =>
                      setQuantity(
                        Math.min(
                          product.quantity,
                          quantity + 1
                        )
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {!outOfStock &&
                product.quantity <= 5 && (
                  <p className="font-body text-sm font-medium text-destructive">
                    Only{" "}
                    {product.quantity} left
                    in stock — order soon!
                  </p>
                )}

              <div className="flex gap-3">
                {outOfStock ? (
                  <div className="flex-1 rounded-full border border-border bg-muted px-6 py-4 text-center font-body text-sm font-medium text-muted-foreground">
                    Out of Stock
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={
                      handleAddToCart
                    }
                    className="flex-1 gap-2 rounded-full py-6 font-body text-base"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Add to Cart
                  </Button>
                )}

                <button
                  onClick={
                    handleToggleWishlist
                  }
                  className="flex aspect-square shrink-0 items-center justify-center rounded-full border border-border px-6 py-6"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      wishlisted
                        ? "fill-rose-500 text-rose-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <ProductRecommendations
            currentProduct={product}
            recentlyViewedIds={
              recentlyViewedIds
            }
          />
        </Suspense>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProductDetail;
