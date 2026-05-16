import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { collection, getDocs, query, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types/product";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "products"), orderBy("name"), limit(4))
        );
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
        setFeaturedProducts(items);
      } catch (err) {
        console.error("Hero: failed to fetch featured products", err);
      }
    };
    fetchFeatured();
  }, []);

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-primary min-h-[85vh] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/20" />
      <div className="absolute inset-0 texture-overlay" />
      <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-ivory/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* LEFT — copy */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-primary-foreground/70 font-body"
            >
              Handcrafted · Sustainable · Indian
            </motion.p>
            <h1 className="text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl lg:text-7xl leading-[1.1]">
              Wear the Art{" "}
              <span className="text-accent">of India</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-primary-foreground/70 font-body leading-relaxed">
              Every thread tells a story. Discover handcrafted Indian fashion from master artisans across 15+ states — where tradition meets contemporary elegance.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                onClick={scrollToProducts}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8 py-6 rounded-full font-body"
              >
                Shop the Collection <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* RIGHT — product grid */}
          {featuredProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="hidden lg:grid grid-cols-2 gap-3"
            >
              {featuredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group cursor-pointer rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/10 hover:border-accent/50 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={product.images?.[0] ?? product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-primary-foreground/90 text-sm font-medium font-body truncate">
                      {product.name}
                    </p>
                    <p className="font-price text-accent text-sm font-semibold mt-0.5">
                      ₹{product.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
