"use client";

import { ButtonLink } from "@/components/ui/Button";
import { motion } from "framer-motion";

export function CallToAction() {
  return (
    <section className="pattern-dark py-16">
      <div className="container-shell text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-white md:text-[40px] md:leading-[48px]">
            Ready to Elevate Your Style?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl font-body text-base text-cream/90">
            Book a consultation today and discover your signature look.
          </p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/book" variant="secondary" size="lg">
              Book Now
            </ButtonLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


