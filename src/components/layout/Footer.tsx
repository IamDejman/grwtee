import Link from "next/link";
import Image from "next/image";

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

const quickLinks = [
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" }
];

const legalLinks = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/payment", label: "Payment Policies" }
];

export function Footer() {
  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/grwtee";

  return (
    <footer className="pattern-dark">
      <div className="container-shell py-14">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="space-y-4">
            <Image src="/logo.svg" alt="GRWTEE" width={150} height={36} style={{ width: "auto", height: "auto" }} />
            <p className="max-w-xs text-sm leading-6 text-cream/90">
              Get Ready With Tee — premium styling services crafted with taste,
              precision, and confidence.
            </p>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full p-2 text-cream transition hover:bg-cream/10 hover:text-gold-light"
              aria-label="Visit GRWTEE on Instagram"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>

          <div>
            <h3 className="font-accent text-sm font-semibold tracking-wider text-gold-light">
              QUICK LINKS
            </h3>
            <ul className="mt-4 space-y-3">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-cream/90 transition hover:text-gold-light"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-accent text-sm font-semibold tracking-wider text-gold-light">
              LEGAL
            </h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-cream/90 transition hover:text-gold-light"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-cream/15 pt-6 md:flex-row md:items-center">
          <p className="text-xs text-cream/75">
            © {new Date().getFullYear()} GRWTEE. All rights reserved.
          </p>
          <p className="text-xs text-cream/60">
            Designed with intention — luxury, clarity, and speed.
          </p>
        </div>
      </div>
    </footer>
  );
}
