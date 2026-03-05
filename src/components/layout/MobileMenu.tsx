"use client";

import { Dialog } from "@headlessui/react";
import Link from "next/link";
import { useState } from "react";

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MobileMenu({
  nav,
  instagramUrl
}: {
  nav: Array<{ href: string; label: string; cta?: boolean }>;
  instagramUrl: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full p-2 text-white transition hover:bg-white/10 md:hidden"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-[60]">
        <div className="fixed inset-0 bg-gray-dark/50 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-end">
            <Dialog.Panel className="w-full max-w-sm bg-cream-light p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <Dialog.Title className="font-heading text-2xl font-semibold text-purple-dark">
                  Menu
                </Dialog.Title>
                <button
                  type="button"
                  className="rounded-full p-2 text-gray-dark transition hover:bg-gray-dark/5"
                  aria-label="Close navigation menu"
                  onClick={() => setOpen(false)}
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <nav className="mt-8 space-y-5" aria-label="Mobile">
                {nav.map((item) =>
                  item.cta ? (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="mt-4 block rounded-full bg-gold px-6 py-3 text-center font-accent text-lg font-semibold tracking-wide text-white transition hover:bg-gold-light"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block font-accent text-lg font-semibold tracking-wide text-gray-dark transition hover:text-green-dark"
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </nav>

              <div className="mt-10 border-t border-gray-medium/60 pt-6">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-accent text-sm font-semibold text-green-dark hover:text-purple-dark"
                >
                  <span className="h-2 w-2 rounded-full bg-gold" />
                  Follow @grwtee on Instagram
                </a>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </>
  );
}


