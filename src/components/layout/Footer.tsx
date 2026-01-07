import Link from "next/link";
import Image from "next/image";

const quickLinks = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
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
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL || "grwteee@gmail.com";

  return (
    <footer className="pattern-dark mt-20">
      <div className="container-shell py-14">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="space-y-4">
            <Image src="/logo.svg" alt="GRWTEE" width={150} height={36} />
            <p className="max-w-xs text-sm leading-6 text-cream/90">
              Get Ready With Tee — premium styling services crafted with taste,
              precision, and confidence.
            </p>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-accent text-sm font-semibold text-cream hover:text-gold-light"
            >
              <span className="h-2 w-2 rounded-full bg-gold" />
              Instagram
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

          <div>
            <h3 className="font-accent text-sm font-semibold tracking-wider text-gold-light">
              CONTACT
            </h3>
            <div className="mt-4 space-y-3 text-sm text-cream/90">
              <p>Lagos, Nigeria</p>
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex text-cream/90 transition hover:text-gold-light"
              >
                {contactEmail}
              </a>
              <p className="text-cream/80">Response time: 24–48 hours</p>
            </div>
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


