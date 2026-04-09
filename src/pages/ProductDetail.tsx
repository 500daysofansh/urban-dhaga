import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, JEWELRY_CATEGORIES } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ArrowLeft, Star, Minus, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, "products", id));
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-6 w-1/4 animate-pulse rounded bg-muted" />
                <div className="h-20 w-full animate-pulse rounded bg-muted" />
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
            <h2 className="text-2xl font-bold font-heading text-foreground">Product not found</h2>
            <Button onClick={() => navigate("/")} className="mt-4 font-body">Go Home</Button>
          </div>
        </main>
      </div>
    );
  }

  const allImages = product.images?.length > 0 ? product.images : [product.image];
  const isJewelry = JEWELRY_CATEGORIES.some((c) => c.toLowerCase() === product.category.toLowerCase());
  const hasSizes = !isJewelry && product.sizes && product.sizes.length > 0;
  const outOfStock = !product.inStock || product.quantity <= 0;
  const rating = 4.3;
  const reviewCount = 127;

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      toast({ title: "Please select a size", variant: "destructive" });
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addToCart(product, selectedSize);
    }
    toast({
      title: "Added to cart 🛒",
      description: `${product.name}${selectedSize ? ` (${selectedSize})` : ""} x${quantity} added.`,
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2 font-body">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Images */}
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                <img
                  src={allImages[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-3">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`h-20 w-20 overflow-hidden rounded-lg border-2 transition-colors ${
                        idx === selectedImage ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <Badge className="mb-3 font-body">{product.category}</Badge>
                <h1 className="text-3xl font-bold font-heading text-foreground sm:text-4xl">{product.name}</h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(rating) ? "fill-saffron text-saffron" : "text-muted"}`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground font-body">({reviewCount} reviews)</span>
              </div>

              <p className="text-3xl font-bold font-heading text-foreground">₹{product.price.toLocaleString()}</p>

              <p className="text-muted-foreground font-body leading-relaxed">{product.description}</p>

              {hasSizes && (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground font-body">Select Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes!.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors font-body ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-foreground hover:bg-accent"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium text-foreground font-body">Quantity</p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-body font-medium">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {outOfStock ? (
                <Badge variant="secondary" className="text-sm font-body">Out of Stock</Badge>
              ) : (
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className="w-full gap-2 rounded-full font-body text-base py-6"
                >
                  <ShoppingBag className="h-5 w-5" /> Add to Cart
                </Button>
              )}

              {product.quantity > 0 && product.quantity <= 5 && (
                <p className="text-sm text-destructive font-body">Only {product.quantity} left in stock!</p>
              )}
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
