import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Product, JEWELRY_CATEGORIES } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Star, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
}

const CRAFT_STORIES: Record<string, string> = {
  "Sarees": "Hand-woven by master weavers from Varanasi",
  "Kurtas": "Block printed by artisans from Jaipur",
  "Dupattas": "Bandhani tie-dye craft from Gujarat",
  "Accessories": "Handcrafted by artisan families from Rajasthan",
  "Lehengas": "Chikankari embroidery from Lucknow",
  "Jewellery": "Kundan work by goldsmiths from Bikaner",
};

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [currentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const allImages = product.images && product.images.length > 0 ? product.images : [product.image];

  const isJewelry = JEWELRY_CATEGORIES.some((c) => c.toLowerCase() === product.category.toLowerCase());
  const hasSizes = !isJewelry && product.sizes && product.sizes.length > 0;
  const outOfStock = !product.inStock || product.quantity <= 0;

  const craftStory = CRAFT_STORIES[product.category] || "Handcrafted by Indian artisans";
  
  // Use useMemo to keep rating/review stable across re-renders
  const { rating, reviewCount } = useMemo(() => ({
    rating: 4 + (product.id.charCodeAt(0) % 10) / 10,
    reviewCount: 20 + (product.id.charCodeAt(0) * 7) % 180,
  }), [product.id]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasSizes && !selectedSize) {
      toast({ title: "Please select a size", variant: "destructive" });
      return;
    }
    addToCart(product, selectedSize);
    toast({
      title: "Added to cart 🛒",
      description: `${product.name}${selectedSize ? ` (${selectedSize})` : ""} has been added to your cart.`,
    });
  };

  const displayImageIndex = isHovered && allImages.length > 1 ? 1 : currentImageIndex;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className="group overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-xl cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <img
            src={allImages[displayImageIndex]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {outOfStock && (
              <Badge variant="secondary" className="font-body text-xs">Out of Stock</Badge>
            )}
            {!outOfStock && product.quantity <= 5 && (
              <Badge className="bg-saffron text-primary-foreground font-body text-xs animate-pulse">
                Limited Edition
              </Badge>
            )}
            {!outOfStock && product.quantity > 5 && (
              <Badge className="bg-accent text-accent-foreground font-body text-xs">
                Handcrafted
              </Badge>
            )}
          </div>

          <Badge className="absolute right-3 top-3 bg-background/80 text-foreground backdrop-blur-sm font-body text-xs">
            {product.category}
          </Badge>

          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <div className="bg-gradient-to-t from-foreground/80 to-transparent p-4 pt-10">
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="w-full gap-1.5 font-body rounded-full"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Quick Add
              </Button>
            </div>
          </div>

          {allImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 transition-opacity group-hover:opacity-0">
              {allImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${idx === currentImageIndex ? "bg-primary" : "bg-background/60"}`}
                />
              ))}
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground font-heading text-base">{product.name}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="font-body text-xs max-w-[200px]">
                <p className="font-semibold mb-1">Craft Story</p>
                <p>{craftStory}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < Math.floor(rating) ? "fill-saffron text-saffron" : "text-muted"}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-body">({reviewCount})</span>
          </div>

          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-1 font-body">{product.description}</p>

          {hasSizes && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.sizes!.map((size) => (
                <button
                  key={size}
                  onClick={(e) => { e.stopPropagation(); setSelectedSize(size); }}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors font-body ${
                    selectedSize === size
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-foreground font-heading">
              ₹{product.price.toLocaleString()}
            </span>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="gap-1.5 rounded-full font-body md:hidden"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductCard;
