"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/Button";

const slides = [
  {
    src: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1400&h=800&fit=crop",
    alt: "Styled Look"
  },
  {
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1400&h=800&fit=crop",
    alt: "Styled Look"
  },
  {
    src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&h=800&fit=crop",
    alt: "Styled Look"
  },
  {
    src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1400&h=800&fit=crop",
    alt: "Styled Look"
  },
  {
    src: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1400&h=800&fit=crop",
    alt: "Styled Look"
  }
];

const INTERVAL = 5000;

export function GalleryPreview() {
  const [current, setCurrent] = useState(0);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(advance, INTERVAL);
    return () => clearInterval(timer);
  }, [advance]);

  return (
    <section className="py-16">
      <div className="container-shell">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
              Our Styled Looks
            </h2>
            <p className="mt-2 max-w-2xl font-body text-base text-gray-dark/80">
              A showcase of curated styling — from everyday wardrobes to red
              carpet moments.
            </p>
          </div>
          <ButtonLink href="/gallery" variant="primary">
            View Full Portfolio
          </ButtonLink>
        </div>

        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl md:aspect-[21/9]">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={slides[current].src}
                alt={slides[current].alt}
                fill
                className="object-cover"
                sizes="100vw"
                priority={current === 0}
              />
            </motion.div>
          </AnimatePresence>

          {/* Subtle gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Navigation dots */}
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 bg-gold"
                    : "w-2 bg-white/60 hover:bg-white/90"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next arrows */}
          <button
            onClick={() =>
              setCurrent((prev) => (prev - 1 + slides.length) % slides.length)
            }
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
            aria-label="Previous slide"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={advance}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
            aria-label="Next slide"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
