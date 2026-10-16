"use client";

import { ButtonLink } from "@/components/ui/Button";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";

/** `december`: show the Lagos in December callout (only while bookings are open). */
export function Hero({ december = false }: { december?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function seekAndPlay() {
      video!.currentTime = 24;
      video!.play().catch(() => {});
    }

    function handleEnded() {
      video!.currentTime = 24;
      video!.play().catch(() => {});
    }

    video.muted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.addEventListener("ended", handleEnded);

    if (video.readyState >= 1) {
      seekAndPlay();
    } else {
      video.addEventListener("loadedmetadata", seekAndPlay, { once: true });
    }

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadedmetadata", seekAndPlay);
    };
  }, []);

  return (
    <section className="relative overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      <div className="container-shell relative z-10 flex min-h-[78vh] flex-col items-center justify-center py-20 text-center">
        {december ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Link
              href="/december"
              className="group inline-flex flex-col items-center gap-2 rounded-3xl border border-gold/60 bg-night/70 px-5 py-3 font-accent text-sm text-cream shadow-lg backdrop-blur-sm transition hover:border-gold hover:bg-night/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold sm:flex-row sm:gap-3 sm:rounded-full sm:py-1.5 sm:pl-1.5 sm:pr-5"
            >
              <span className="whitespace-nowrap rounded-full bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-wider text-night">
                Lagos in December
              </span>{" "}
              <span className="inline-flex items-center gap-2">
                Book your styling consultation
                <span aria-hidden="true" className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </motion.div>
        ) : null}

        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <ButtonLink href="/services" variant="primary" size="lg">
              Explore Services
            </ButtonLink>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <ButtonLink
              href="/book"
              variant="outline"
              size="lg"
              className="border-cream/70 text-white hover:bg-cream hover:text-purple-dark"
            >
              Book Now
            </ButtonLink>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-14 h-px w-24 bg-gold/70"
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
        />
      </div>
    </section>
  );
}
