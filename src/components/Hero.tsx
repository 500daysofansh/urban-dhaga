import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const HERO_IMAGES = [
  "https://res.cloudinary.com/dulvmnjtd/image/upload/q_auto:best/v1778002309/pcx8gw7r6x6safuhikux.png",
  "https://res.cloudinary.com/dulvmnjtd/image/upload/q_auto:best/v1777982233/tuupf19ftk3qg6am6j7y.png",
  "https://res.cloudinary.com/dulvmnjtd/image/upload/q_auto:best/v1777889502/k28tvloeouigagyruora.png",
  "https://res.cloudinary.com/dulvmnjtd/image/upload/q_auto:best/v1777814694/xql0ep4eax9kyjnvyzqs.png",
  "https://res.cloudinary.com/dulvmnjtd/image/upload/q_auto:best/v1777811207/i9s02rcsxoemwxe97all.png",
  "https://res.cloudinary.com/dulvmnjtd/image/upload/q_auto:best/v1777806036/fw3eyhwth7lmqtcxhaiz.png",
  "https://res.cloudinary.com/dulvmnjtd/image/upload/q_auto:best/v1777569589/bshjgxzkix0c2b6oiqf0.png",
  "https://res.cloudinary.com/dulvmnjtd/image/upload/q_auto:best/v1777569178/nsrs5fbhypzbaxdi1bbr.png",
];

const Hero = () => {
  const [bgUrl] = useState(() => {
    const url = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
    return url;
  });

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative w-full min-h-[90vh] flex items-end overflow-hidden">

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0"
      >
        <img
          src={bgUrl}
          alt=""
          fetchPriority="high"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      </motion.div>

      <div className="relative z-10 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 pt-40">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="max-w-2xl"
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
            className="mt-10"
          >
            <Button
              size="lg"
              onClick={scrollToProducts}
              className="gap-2 bg-white text-black hover:bg-white/90 text-base px-8 py-6 rounded-full font-body font-medium"
            >
              Shop the Collection <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-16 flex gap-10 border-t border-white/10 pt-8"
        >
          {[
            { value: "500+", label: "Artisans" },
            { value: "15+", label: "States" },
            { value: "100%", label: "Handcrafted" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-price text-2xl font-bold text-white">{stat.value}</p>
              <p className="font-body text-xs text-white/40 uppercase tracking-widest mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
