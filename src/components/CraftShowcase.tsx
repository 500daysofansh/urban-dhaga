import { motion } from "framer-motion";

const crafts = [
  { name: "Block Print", emoji: "🎨", color: "from-saffron/20 to-saffron/5" },
  { name: "Chikankari", emoji: "🪡", color: "from-forest/20 to-forest/5" },
  { name: "Bandhani", emoji: "🔴", color: "from-primary/20 to-primary/5" },
  { name: "Ikat", emoji: "🧵", color: "from-saffron/20 to-ivory/50" },
  { name: "Kantha", emoji: "🪢", color: "from-forest/20 to-ivory/50" },
  { name: "Ajrakh", emoji: "🏵️", color: "from-primary/20 to-forest/10" },
];

const CraftShowcase = () => (
  <section className="py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary font-body mb-3">
          Heritage Techniques
        </p>
        <h2 className="text-3xl font-bold text-foreground font-heading sm:text-4xl">
          Explore by Craft
        </h2>
      </motion.div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
        {crafts.map((craft, i) => (
          <motion.div
            key={craft.name}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="snap-center shrink-0"
          >
            <div className={`group cursor-pointer w-40 h-48 sm:w-48 sm:h-56 rounded-2xl bg-gradient-to-br ${craft.color} border border-border/50 flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-primary/30`}>
              <span className="text-5xl transition-transform duration-300 group-hover:scale-125">
                {craft.emoji}
              </span>
              <p className="text-sm font-semibold text-foreground font-heading">{craft.name}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default CraftShowcase;
