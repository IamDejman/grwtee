"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";


type Slide =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string; alt: string };

const slides: Slide[] = [
  { type: "image", src: "/slideshow/005353F3-B82C-464A-AFE3-8AB9F61E57DB.jpeg", alt: "Styled Look" },
  { type: "image", src: "/slideshow/524B424F-2713-4F70-8B6F-3B24632AD5EB.jpeg", alt: "Styled Look" },
  { type: "image", src: "/slideshow/58EC7F53-EC7B-4852-B11B-7EFAD73428EB.jpeg", alt: "Styled Look" },
  { type: "image", src: "/slideshow/768DE20C-075C-4C39-BC0D-B5DBE5BDF695.jpeg", alt: "Styled Look" },
  { type: "image", src: "/slideshow/8E80C382-A5CB-40E8-849E-53E60E78E247.jpeg", alt: "Styled Look" },
  { type: "video", src: "/slideshow/slideshow-video.mp4", alt: "Styling Session" },
  { type: "image", src: "/slideshow/F43DC580-D67E-4AE2-B6A5-732EBEB1289E.jpeg", alt: "Styled Look" },
  { type: "image", src: "/slideshow/IMG_9925.jpeg", alt: "Styled Look" },
  { type: "image", src: "/slideshow/d2de7734-13a0-4251-ba0c-c21b08124766.jpeg", alt: "Styled Look" },
  { type: "video", src: "/slideshow/IMG_0391.MP4", alt: "Styling Session" },
];

const IMAGE_INTERVAL = 5000;

function SlideVideo({ src, isActive, onEnded }: { src: string; isActive: boolean; onEnded: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      onEnded={onEnded}
      className="h-full w-full object-cover"
    />
  );
}

export function GalleryPreview() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  // Auto-advance for image slides
  useEffect(() => {
    const slide = slides[current];
    if (slide.type === "video") {
      // Video controls its own advancement via onEnded
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(advance, IMAGE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current, advance]);

  const slide = slides[current];

  return (
    <section className="py-16">
      <div className="container-shell">
        <div>
          <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
            Our Styled Looks
          </h2>
          <p className="mt-2 max-w-2xl font-body text-base text-gray-dark/80">
            A showcase of curated styling — from everyday wardrobes to red
            carpet moments.
          </p>
        </div>

        <div className="relative mt-10 aspect-[9/16] overflow-hidden rounded-2xl sm:aspect-[2/3] md:aspect-[3/4]">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {slide.type === "video" ? (
                <SlideVideo src={slide.src} isActive onEnded={advance} />
              ) : (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={current === 0}
                />
              )}
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
