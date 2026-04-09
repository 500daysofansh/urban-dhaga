import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { label: "Artisans", value: 200, suffix: "+" },
  { label: "Indian States", value: 15, suffix: "+" },
  { label: "Handmade", value: 100, suffix: "%" },
];

const Counter = ({ target, suffix }: { target: number; suffix: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref} className="text-4xl font-bold text-primary font-heading sm:text-5xl">
      {count}{suffix}
    </span>
  );
};

const BrandStory = () => (
  <section className="bg-ivory/50 py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
        {/* Image side */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted lg:aspect-[3/4]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-forest/20 to-saffron/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <p className="text-6xl mb-4">🧶</p>
              <p className="text-muted-foreground font-body text-sm">Artisan at work</p>
            </div>
          </div>
        </motion.div>

        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary font-body mb-3">
            Our Story
          </p>
          <h2 className="text-3xl font-bold text-foreground font-heading sm:text-4xl lg:text-5xl leading-tight">
            Connecting Indian Artisans to the World
          </h2>
          <p className="mt-6 text-muted-foreground font-body leading-relaxed text-base">
            Urban Dhaga was born from a simple belief — that India's textile heritage deserves a global stage.
            We work directly with artisan families across 15+ states, ensuring fair wages and preserving
            centuries-old techniques like block printing, Chikankari, and Bandhani.
          </p>
          <p className="mt-4 text-muted-foreground font-body leading-relaxed text-base">
            Every piece you wear carries the fingerprint of its maker — a story woven into every thread,
            a tradition honored with every stitch.
          </p>

          {/* Animated counters */}
          <div className="mt-10 grid grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <Counter target={stat.value} suffix={stat.suffix} />
                <p className="mt-1 text-sm text-muted-foreground font-body">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default BrandStory;
