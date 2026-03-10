"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import type { Slide } from "@/lib/slideshow-data";

export default function PortfolioLightbox({
  open,
  onClose,
  current,
  index,
  total,
  onPrev,
  onNext,
}: {
  open: boolean;
  onClose: () => void;
  current: Slide;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!open || !video || current.type !== "video") return;
    video.muted = true;
    video.volume = 0;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, [open, current]);

  return (
    <Modal open={open} onClose={onClose} fullScreen>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="relative h-full w-full"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {current.type === "image" ? (
            <Image
              src={current.src}
              alt={current.alt}
              fill
              className="object-contain"
              sizes="100vw"
            />
          ) : (
            <video
              ref={videoRef}
              src={current.src}
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          )}
        </motion.div>

        {/* Minimal controls overlay */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30"
          aria-label="Previous"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={index >= total - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30"
          aria-label="Next"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </motion.div>
    </Modal>
  );
}
