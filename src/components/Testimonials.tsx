import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const reviews = [
  {
    name: "Priya Sharma",
    city: "Mumbai",
    text: "The Banarasi saree I ordered exceeded all expectations. The craftsmanship is impeccable — you can feel the artisan's love in every weave.",
    rating: 5,
  },
  {
    name: "Ananya Gupta",
    city: "Delhi",
    text: "I've bought kurtas from many brands, but Urban Dhaga's block-printed collection is on another level. True art you can wear!",
    rating: 5,
  },
  {
    name: "Meera Patel",
    city: "Ahmedabad",
    text: "Sustainable, beautiful, and so comfortable. The Bandhani dupatta is now my go-to accessory. Highly recommend!",
    rating: 5,
  },
  {
    name: "Ritu Agarwal",
    city: "Jaipur",
    text: "Knowing that my purchase supports real artisan families makes every piece even more special. Beautiful quality!",
    rating: 4,
  },
];

const Testimonials = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % reviews.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section className="bg-forest py-20">
      <div
        className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-ivory/60 font-body mb-3">
          What Our Customers Say
        </p>
        <h2 className="text-3xl font-bold text-ivory font-heading sm:text-4xl mb-12">
          Loved by Thousands
        </h2>

        <div className="relative min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < reviews[current].rating ? "fill-saffron text-saffron" : "text-ivory/30"
                    }`}
                  />
                ))}
              </div>
              <blockquote className="text-lg text-ivory/90 font-body leading-relaxed max-w-2xl italic">
                "{reviews[current].text}"
              </blockquote>
              <div className="mt-6">
                <div className="h-12 w-12 rounded-full bg-saffron/20 mx-auto flex items-center justify-center text-lg">
                  {reviews[current].name.charAt(0)}
                </div>
                <p className="mt-3 font-semibold text-ivory font-heading">{reviews[current].name}</p>
                <p className="text-sm text-ivory/50 font-body">{reviews[current].city}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="mt-8 flex justify-center gap-2">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-8 bg-saffron" : "w-2 bg-ivory/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
