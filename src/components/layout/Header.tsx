"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MobileMenu } from "@/components/layout/MobileMenu";

const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" }
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
    <header
      className={[
        "sticky top-0 z-50 w-full border-b transition-colors",
        scrolled
          ? "border-gray-medium/60 bg-cream-light/80 backdrop-blur"
          : "border-transparent bg-transparent"
      ].join(" ")}
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
            height={32}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative font-accent text-sm font-semibold tracking-wide text-gray-dark transition hover:text-teal-dark"
            >
              {item.label}
              <span className="absolute -bottom-2 left-0 h-[2px] w-0 bg-gold transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full p-2 text-teal-dark transition hover:bg-teal-dark/10 md:inline-flex"
            aria-label="Visit GRWTEE on Instagram"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>
          <MobileMenu nav={nav} instagramUrl={instagramUrl} />
        </div>
      </div>
    </header>
  );
}


