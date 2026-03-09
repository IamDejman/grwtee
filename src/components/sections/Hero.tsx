"use client";

import { ButtonLink } from "@/components/ui/Button";
import { useEffect, useRef } from "react";

export function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href="/services" variant="primary" size="lg">
            Explore Services
          </ButtonLink>
          <ButtonLink
            href="/book"
            variant="outline"
            size="lg"
            className="border-cream/70 text-white hover:bg-cream hover:text-purple-dark"
          >
            Book Now
          </ButtonLink>
        </div>

        <div className="mt-14 h-px w-24 bg-gold/70" aria-hidden="true" />
      </div>
    </section>
  );
}
