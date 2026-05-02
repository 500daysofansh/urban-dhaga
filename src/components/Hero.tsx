import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Hero images ──────────────────────────────────────────────────────────────
// Replace these URLs with your actual Cloudinary product image URLs.
// Ideal: tall portrait photos (4:5 or 3:4 ratio), 800–1200px wide.
// Upload 2–3 of your best saree/lehenga/kurta photos to Cloudinary
// and paste the URLs here.
const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
    // ↑ Replace with your Cloudinary URL, e.g.:
    // "https://res.cloudinary.com/YOUR_CLOUD/image/upload/w_800,f_auto,q_auto/your-saree.jpg"
    label: "Banarasi Silks",
    tag: "New Collection",
  },
  {
    image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80",
    label: "Block Print Kurtas",
    tag: "Artisan Crafted",
  },
  {
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80",
    label: "Chikankari Lehengas",
    tag: "Limited Edition",
  },
];

const Hero = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const go = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const prev = () => go((current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  const next = () => go((current + 1) % HERO_SLIDES.length);

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const slide = HERO_SLIDES[current];

  return (
    <section className="relative overflow-hidden bg-primary min-h-[90vh] flex items-center">

      {/* ── Background texture (full width, always) ── */}
      <div className="absolute inset-0 texture-overlay pointer-events-none" />

      {/* ── Ambient glow blobs ── */}
      <div className="absolute -left-32 top-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[120px] pointer-events-none" />
      <div className="absolute right-[40%] -bottom-20 h-[300px] w-[300px] rounded-full bg-primary-foreground/5 blur-[80px] pointer-events-none" />

      {/* ── Right side product image (desktop) ── */}
      <div className="absolute right-0 top-0 hidden h-full w-[48%] lg:block">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0, scale: 1.03 }),
              center: { x: 0, opacity: 1, scale: 1 },
              exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0, scale: 0.98 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0"
          >
            <img
              src={slide.image}
              alt={slide.label}
              className="h-full w-full object-cover object-top"
            />
            {/* Gradient bleed — left edge fades into primary bg so text stays readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
            {/* Bottom fade so the section edge is clean */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/60 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Floating label on image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`label-${current}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="absolute bottom-12 right-8 z-10"
          >
            <div className="rounded-2xl border border-white/20 bg-black/30 px-5 py-3 backdrop-blur-md">
              <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-white/60">
                {slide.tag}
              </p>
              <p className="font-heading text-lg font-bold text-white">{slide.label}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Mobile full-bleed image (behind text) ── */}
      <div className="absolute inset-0 lg:hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={`mobile-${current}`}
            src={slide.image}
            alt={slide.label}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full w-full object-cover object-top"
          />
        </AnimatePresence>
        {/* Dark overlay so white text stays readable on any photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/65 to-primary/90" />
      </div>

      {/* ── Main content ── */}
      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-xl lg:max-w-2xl">

          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-4 font-body text-sm font-medium uppercase tracking-[0.25em] text-primary-foreground/60"
          >
            Handcrafted · Sustainable · Indian
          </motion.p>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="font-heading text-5xl font-bold leading-[1.08] tracking-tight text-primary-foreground sm:text-6xl lg:text-7xl"
          >
            Wear the Art{" "}
            <span className="text-accent italic">of India</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-6 max-w-md font-body text-base leading-relaxed text-primary-foreground/65 sm:text-lg"
          >
            Every thread tells a story. Discover handcrafted Indian fashion from
            master artisans across 15+ states — where tradition meets contemporary elegance.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Button
              size="lg"
              onClick={scrollToProducts}
              className="gap-2 rounded-full bg-accent px-8 py-6 font-body text-base text-accent-foreground hover:bg-accent/90"
            >
              Shop the Collection <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Slide controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12 flex items-center gap-5"
          >
            {/* Prev / Next */}
            <button
              onClick={prev}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-8 h-2 bg-accent"
                      : "w-2 h-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Slide counter */}
            <span className="font-body text-xs text-white/40">
              {String(current + 1).padStart(2, "0")} / {String(HERO_SLIDES.length).padStart(2, "0")}
            </span>
          </motion.div>

        </div>
      </div>

      {/* ── Bottom gradient fade into page background ── */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent pointer-events-none" />

    </section>
  );
};

export default Hero;
