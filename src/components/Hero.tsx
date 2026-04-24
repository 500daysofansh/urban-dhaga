import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
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
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
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
            {/* Kept only the Shop Collection button */}
            <Button
              size="lg"
              onClick={scrollToProducts}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8 py-6 rounded-full font-body"
            >
              Shop the Collection <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;