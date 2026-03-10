"use client";

import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { motion } from "framer-motion";

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
      <motion.button
        type="button"
        className="inline-flex items-center justify-center rounded-full p-2 text-white transition hover:bg-white/10 md:hidden"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.9 }}
      >
        <MenuIcon className="h-6 w-6" />
      </motion.button>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={setOpen} className="relative z-[60]">
          <Transition.Child
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-dark/50 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-end">
              <Transition.Child
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-x-8"
                enterTo="opacity-100 translate-x-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-x-0"
                leaveTo="opacity-0 translate-x-8"
                as={Fragment}
              >
                <Dialog.Panel className="w-full max-w-sm bg-cream-light p-6 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="font-heading text-2xl font-semibold text-purple-dark">
                      Menu
                    </Dialog.Title>
                    <motion.button
                      type="button"
                      className="rounded-full p-2 text-gray-dark transition hover:bg-gray-dark/5"
                      aria-label="Close navigation menu"
                      onClick={() => setOpen(false)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CloseIcon className="h-6 w-6" />
                    </motion.button>
                  </div>

                  <nav className="mt-8 space-y-5" aria-label="Mobile">
                    {nav.map((item, i) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.2 }}
                      >
                        {item.cta ? (
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="mt-4 block rounded-full bg-gold px-6 py-3 text-center font-accent text-lg font-semibold tracking-wide text-white transition hover:bg-gold-light"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="block font-accent text-lg font-semibold tracking-wide text-gray-dark transition hover:text-green-dark"
                          >
                            {item.label}
                          </Link>
                        )}
                      </motion.div>
                    ))}
                  </nav>

                  <motion.div
                    className="mt-10 border-t border-gray-medium/60 pt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.2 }}
                  >
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 font-accent text-sm font-semibold text-green-dark hover:text-purple-dark"
                    >
                      <span className="h-2 w-2 rounded-full bg-gold" />
                      Follow @grwtee on Instagram
                    </a>
                  </motion.div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}


