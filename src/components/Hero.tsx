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
          query(collection(db, "products"), orderBy("name"), limit(3))
        );
        setFeaturedProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[]
        );
      } catch (err) {
        console.error("Hero fetch failed:", err);
      }
    };
    fetchFeatured();
  }, []);

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const [p0, p1, p2] = featuredProducts;

  return (
    <section className="relative overflow-hidden bg-primary min-h-[85vh] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/20" />
      <div className="absolute inset-0 texture-overlay" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[560px] rounded-3xl overflow-hidden">

          {/* LEFT — text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col justify-center px-8 py-14 lg:px-12"
          >
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mb-5 text-sm font-medium uppercase tracking-[0.25em] text-primary-foreground/50 font-body"
            >
              Handcrafted · Sustainable · Indian
            </motion.p>
            <h1 className="text-5xl font-bold tracking-tight text-primary-foreground lg:text-6xl leading-[1.05]">
              Wear the Art{" "}
              <span className="text-accent">of India</span>
            </h1>
            <p className="mt-6 max-w-sm text-base text-primary-foreground/60 font-body leading-relaxed">
              Every thread tells a story. Discover handcrafted Indian fashion from master artisans across 15+ states — where tradition meets contemporary elegance.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-10 flex flex-wrap items-center gap-5"
            >
              <Button
                size="lg"
                onClick={scrollToProducts}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8 py-6 rounded-full font-body"
              >
                Shop the Collection <ArrowRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-primary-foreground/40 font-body">
                15+ states · 500+ artisans
              </span>
            </motion.div>
          </motion.div>

          {/* RIGHT — photos with text overlay */}
          {featuredProducts.length === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              className="hidden lg:grid grid-cols-2 grid-rows-2 gap-0.5 bg-black/20"
            >
              {/* Top-left */}
              <div
                className="relative overflow-hidden cursor-pointer group"
                onClick={() => navigate(`/product/${p0.id}`)}
              >
                <img
                  src={p0.images?.[0] ?? p0.image}
                  alt={p0.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white/80 text-xs font-body truncate">{p0.name}</p>
                  <p className="font-price text-amber-400 text-base font-semibold mt-0.5">
                    ₹{p0.price.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Right — tall, spans 2 rows */}
              <div
                className="relative overflow-hidden cursor-pointer group row-span-2"
                onClick={() => navigate(`/product/${p1.id}`)}
              >
                <img
                  src={p1.images?.[0] ?? p1.image}
                  alt={p1.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="text-[10px] font-body font-medium bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2.5 py-1 rounded-full">
                    Bestseller
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-white/85 text-sm font-body font-medium">{p1.name}</p>
                  <p className="font-price text-amber-400 text-xl font-bold mt-1">
                    ₹{p1.price.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Bottom-left */}
              <div
                className="relative overflow-hidden cursor-pointer group"
                onClick={() => navigate(`/product/${p2.id}`)}
              >
                <img
                  src={p2.images?.[0] ?? p2.image}
                  alt={p2.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white/80 text-xs font-body truncate">{p2.name}</p>
                  <p className="font-price text-amber-400 text-base font-semibold mt-0.5">
                    ₹{p2.price.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

            </motion.div>
          )}

        </div>
      </div>
    </section>
  );
};

export default Hero;
