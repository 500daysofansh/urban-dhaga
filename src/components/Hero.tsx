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
    <section className="relative overflow-hidden min-h-[90vh] flex items-end">

      {/* Full-bleed background — biggest product image */}
      {p1 && (
        <div className="absolute inset-0">
          <img
            src={p1.images?.[0] ?? p1.image}
            alt=""
            className="w-full h-full object-cover object-top"
          />
          {/* Dark gradient so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
        </div>
      )}

      {/* Fallback bg if no products yet */}
      {!p1 && <div className="absolute inset-0 bg-gray-900" />}

      {/* Content */}
      <div className="relative z-10 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-end">

          {/* LEFT — text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/50 font-body"
            >
              Handcrafted · Sustainable · Indian
            </motion.p>
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.05] font-heading">
              Wear the Art{" "}
              <span className="text-accent">of India</span>
            </h1>
            <p className="mt-6 max-w-md text-base text-white/60 font-body leading-relaxed">
              Every thread tells a story. Discover handcrafted Indian fashion from master artisans across 15+ states — where tradition meets contemporary elegance.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Button
                size="lg"
                onClick={scrollToProducts}
                className="gap-2 bg-white text-black hover:bg-white/90 text-base px-8 py-6 rounded-full font-body font-medium"
              >
                Shop the Collection <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={scrollToProducts}
                className="gap-2 border-white/30 text-white hover:bg-white/10 text-base px-8 py-6 rounded-full font-body"
              >
                View Lookbook
              </Button>
            </motion.div>
          </motion.div>

          {/* RIGHT — two smaller product cards */}
          {p0 && p2 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="hidden lg:flex gap-4 items-end justify-end"
            >
              {[p0, p2].map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.6 }}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className={`relative cursor-pointer group rounded-2xl overflow-hidden flex-shrink-0 ${
                    i === 0 ? "w-44 h-64" : "w-44 h-52"
                  }`}
                >
                  <img
                    src={product.images?.[0] ?? product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white/80 text-xs font-body truncate">{product.name}</p>
                    <p className="font-price text-amber-400 text-sm font-semibold mt-0.5">
                      ₹{product.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

        </div>

        {/* Bottom stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-16 flex gap-8 border-t border-white/10 pt-8"
        >
          {[
            { value: "500+", label: "Artisans" },
            { value: "15+", label: "States" },
            { value: "100%", label: "Handcrafted" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-price text-2xl font-bold text-white">{stat.value}</p>
              <p className="font-body text-xs text-white/40 uppercase tracking-widest mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
