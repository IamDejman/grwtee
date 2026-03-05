"use client";

import { ButtonLink } from "@/components/ui/Button";
import { useEffect, useRef } from "react";

export function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video
      .play()
      .catch(() => {
        // Autoplay may still be blocked; fail silently
      });
  }, []);

  return (
    <section className="relative overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-green-dark/70" />

      <div className="container-shell relative z-10 flex min-h-[78vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-accent text-xs font-semibold tracking-[0.25em] text-gold-light">
          PREMIUM STYLING • LAGOS, NIGERIA
        </p>
        <h1 className="mt-6 max-w-3xl font-heading text-[36px] font-semibold leading-[44px] text-white md:text-[56px] md:leading-[64px]">
          Get Ready With Tee
        </h1>
        <p className="mt-5 max-w-2xl font-body text-base leading-7 text-cream/90 md:text-lg">
          Professional styling services tailored to your unique style.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href="/services" variant="primary" size="lg">
            Explore Services
          </ButtonLink>
          <ButtonLink
            href="/contact"
            variant="outline"
            size="lg"
            className="border-cream/70 text-white hover:bg-cream hover:text-green-dark"
          >
            Book a Consultation
          </ButtonLink>
        </div>

        <div className="mt-14 h-px w-24 bg-gold/70" aria-hidden="true" />
      </div>
    </section>
  );
}
