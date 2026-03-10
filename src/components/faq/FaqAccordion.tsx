"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type FaqItem = { q: string; a: string };

function AccordionItem({ item, index }: { item: FaqItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.03 * index, duration: 0.3 }}
      className="border-b border-gray-medium/60 last:border-b-0"
    >
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="group flex w-full cursor-pointer list-none items-center justify-between p-5 text-left open:bg-cream-light/60"
        aria-expanded={isOpen}
      >
        <span className="font-accent text-[18px] font-semibold text-purple-medium">
          {item.q}
        </span>
        <motion.span
          className="ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-dark/10 text-green-dark"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.25 }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 font-body text-[16px] leading-7 text-gray-dark/85">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FaqSection({
  title,
  items,
  sectionIndex
}: {
  title: string;
  items: FaqItem[];
  sectionIndex: number;
}) {
  return (
    <motion.section
      className="mt-10"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: 0.1 * sectionIndex, duration: 0.4 }}
    >
      <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
        {title}
      </h2>
      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-gray-medium/60">
        {items.map((item, i) => (
          <AccordionItem key={i} item={item} index={i} />
        ))}
      </div>
    </motion.section>
  );
}
