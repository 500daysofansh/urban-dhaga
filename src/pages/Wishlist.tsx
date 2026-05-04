import { useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Trash2, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { cardImage } from "@/lib/cloudinary";
import { JEWELRY_CATEGORIES } from "@/types/product";

const Wishlist = () => {
  const navigate = useNavigate();
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (product: (typeof items)[0]) => {
    const isJewelry = JEWELRY_CATEGORIES.some(
      (c) => c.toLowerCase() === product.category.toLowerCase()
    );
    const hasSizes = !isJewelry && product.sizes && product.sizes.length > 0;

    // If product needs a size, send to product page instead
    if (hasSizes) {
      navigate(`/product/${product.id}`);
      return;
    }

    addToCart(product);
    toast({
      title: "Added to cart",
      description: product.name,
    });
  };

  const handleRemove = (id: string, name: string) => {
    removeFromWishlist(id);
    toast({ title: `Removed from wishlist`, description: name });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Helmet>
        <title>My Wishlist — Urban Dhage</title>
        <meta name="description" content="Your saved products on Urban Dhage." />
      </Helmet>

      <Navbar />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  My Wishlist
                </h1>
                <p className="mt-0.5 font-body text-sm text-muted-foreground">
                  {items.length === 0
                    ? "No saved items yet"
                    : `${items.length} ${items.length === 1 ? "item" : "items"} saved`}
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearWishlist();
                  toast({ title: "Wishlist cleared" });
                }}
                className="gap-1.5 font-body text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
          </div>

          {/* Empty state */}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Heart className="h-9 w-9 text-muted-foreground" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Your wishlist is empty
              </h2>
              <p className="mt-2 max-w-xs font-body text-sm text-muted-foreground">
                Save products you love by tapping the heart icon on any product card.
              </p>
              <Button
                className="mt-6 rounded-full font-body"
                onClick={() => navigate("/")}
              >
                Browse Collection
              </Button>
            </div>
          )}

          {/* Grid */}
          {items.length > 0 && (
            <motion.div
              layout
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              <AnimatePresence>
                {items.map((product) => {
                  const image = cardImage(
                    product.images?.length > 0 ? product.images[0] : product.image
                  );
                  const outOfStock = !product.inStock || product.quantity <= 0;

                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="group relative overflow-hidden rounded-xl border border-border bg-card"
                    >
                      {/* Image */}
                      <div
                        className="relative aspect-[4/5] cursor-pointer overflow-hidden bg-muted"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <img
                          src={image}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {outOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
                            <span className="rounded-full border border-border bg-background px-3 py-1 font-body text-xs font-medium text-muted-foreground">
                              Out of Stock
                            </span>
                          </div>
                        )}

                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(product.id, product.name);
                          }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur-sm transition-colors hover:bg-background"
                        >
                          <Heart className="h-3.5 w-3.5 fill-accent text-accent" />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="mb-0.5 font-body text-[11px] uppercase tracking-widest text-muted-foreground">
                          {product.category}
                        </p>
                        <h3
                          className="mb-2 cursor-pointer truncate font-heading text-sm font-semibold text-foreground hover:underline"
                          onClick={() => navigate(`/product/${product.id}`)}
                        >
                          {product.name}
                        </h3>

                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading text-base font-semibold text-foreground">
                            ₹{product.price.toLocaleString("en-IN")}
                          </span>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={outOfStock}
                            className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 font-body text-xs font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ShoppingBag className="h-3 w-3" />
                            {outOfStock ? "Sold out" : "Add to cart"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Bottom CTA */}
          {items.length > 0 && (
            <div className="mt-10 flex justify-center">
              <Button
                variant="outline"
                className="rounded-full font-body"
                onClick={() => navigate("/")}
              >
                Continue Shopping
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Wishlist;
