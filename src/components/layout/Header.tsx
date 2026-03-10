"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/Button";
import { MobileMenu } from "@/components/layout/MobileMenu";

const nav = [
  { href: "/about", label: "About Us" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/services", label: "Services" },
  { href: "/book", label: "Book Now", cta: true }
];

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.5 2.5h9A5 5 0 0 1 21.5 7.5v9a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M17.5 6.75h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/grwtee";

  return (
    <motion.header
      className={[
        "sticky top-0 z-50 w-full border-b transition-colors duration-300",
        scrolled
          ? "border-transparent bg-[#422064]/95 backdrop-blur"
          : "border-transparent bg-[#422064]"
      ].join(" ")}
      animate={{
        boxShadow: scrolled ? "0 4px 12px rgba(0,0,0,0.08)" : "0 0 0 transparent"
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="container-shell flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="GRWTEE home"
        >
          <Image
            src="/logo.svg"
            alt="GRWTEE"
            width={132}
            height={24}
            className="brightness-0 invert"
            style={{ width: 132, height: "auto" }}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {nav.map((item) =>
            item.cta ? (
              <motion.div
                key={item.href}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <ButtonLink
                  href={item.href}
                  variant="secondary"
                  size="sm"
                >
                  {item.label}
                </ButtonLink>
              </motion.div>
            ) : (
              <motion.div
                key={item.href}
                className="relative"
                initial="rest"
                whileHover="hover"
                variants={{
                  rest: {},
                  hover: {}
                }}
              >
                <Link
                  href={item.href}
                  className="relative font-accent text-sm font-semibold tracking-wide text-white/90 transition-colors hover:text-gold-light"
                >
                  {item.label}
                </Link>
                <motion.span
                  className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-gold-light"
                  variants={{
                    rest: { scaleX: 0 },
                    hover: { scaleX: 1 }
                  }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            )
          )}
        </nav>

        <div className="flex items-center gap-3">
          <motion.a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full p-2 text-white/80 transition hover:text-gold-light md:inline-flex"
            aria-label="Visit GRWTEE on Instagram"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <InstagramIcon className="h-5 w-5" />
          </motion.a>
          <MobileMenu nav={nav} instagramUrl={instagramUrl} />
        </div>
      </div>
    </motion.header>
  );
}


