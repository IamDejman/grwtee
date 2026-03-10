"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { slides, type Slide } from "@/lib/slideshow-data";

const PortfolioLightbox = dynamic(
  () =>
    import("@/components/gallery/PortfolioLightbox").then((m) => ({
      default: m.default,
    })),
  { ssr: false }
);

/** Asymmetric layout: some items span 2 cols for a bold, editorial grid. */
const getSpan = (i: number) => {
  if (i === 0) return "col-span-2"; // first: full width
  if (i === 3 || i === 6) return "col-span-2"; // occasional full-width
  return "col-span-1";
};

export function PortfolioGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openIndex === null) return;
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight")
        setOpenIndex((prev) =>
          prev === null ? null : Math.min(prev + 1, slides.length - 1)
        );
      if (e.key === "ArrowLeft")
        setOpenIndex((prev) =>
          prev === null ? null : Math.max(prev - 1, 0)
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex]);

  const current = openIndex === null ? null : slides[openIndex];

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2 md:gap-3 lg:gap-4">
        {slides.map((slide, idx) => (
          <motion.button
            key={`${slide.src}-${idx}`}
            type="button"
            onClick={() => setOpenIndex(idx)}
            className={`group relative w-full overflow-hidden ${getSpan(idx)}`}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ delay: 0.03 * idx, duration: 0.35 }}
          >
            <div
              className={`relative w-full overflow-hidden bg-black ${
                idx === 0 || idx === 3 || idx === 6
                  ? "aspect-[21/9] sm:aspect-[2/1]"
                  : "aspect-[4/5] sm:aspect-[3/4]"
              }`}
            >
              {slide.type === "image" ? (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
                />
              ) : (
                <>
                  <video
                    src={slide.src}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      v.muted = true;
                      v.volume = 0;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/80 bg-white/10">
                      <svg className="ml-1 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {current && openIndex !== null && (
        <PortfolioLightbox
          open
          onClose={() => setOpenIndex(null)}
          current={current}
          index={openIndex}
          total={slides.length}
          onPrev={() =>
            setOpenIndex((prev) =>
              prev === null ? null : Math.max(prev - 1, 0)
            )
          }
          onNext={() =>
            setOpenIndex((prev) =>
              prev === null ? null : Math.min(prev + 1, slides.length - 1)
            )
          }
        />
      )}
    </>
  );
}
